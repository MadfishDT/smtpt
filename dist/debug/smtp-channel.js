"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promised_timeout_1 = require("promised-timeout");
const line_buffer_1 = require("./line-buffer");
const rxjs_1 = require("rxjs");
// it's module work on nodejs or electron
class SMTPChannel {
    constructor(config) {
        if (window.require) {
            this._net = window.require('net');
            this._tls = window.require('tls');
            this._stream = window.require('stream');
        }
        this._config = Object.assign({
            host: 'localhost',
            port: 25,
            timeout: 0 // no timeout
        }, config); // class and socket configuration
        this._socket = null; // the socket connecting to the server
        this._receiveBuffer = new line_buffer_1.LineBuffer(); // for reading server replies in lines
        this._sendBuffer = new line_buffer_1.LineBuffer(); // for reading socket write commands in lines
        this._isSecure = false;
        this.closeSubject = new rxjs_1.Subject();
        this.commandSubject = new rxjs_1.Subject();
        this.connectSubject = new rxjs_1.Subject();
        this.endSubject = new rxjs_1.Subject();
        this.errorSubject = new rxjs_1.Subject();
        this.receiveSubject = new rxjs_1.Subject();
        this.replySubject = new rxjs_1.Subject();
        this.sendSubject = new rxjs_1.Subject();
        this.timeoutSubject = new rxjs_1.Subject();
    }
    connect(handler, expireTime) {
        return promised_timeout_1.timeout({
            time: expireTime,
            action: () => this._connectAsPromised(handler),
            error: new Error('Command has timed out')
        });
    }
    close(expireTime) {
        return promised_timeout_1.timeout({
            time: expireTime,
            action: () => this._closeAsPromised(),
            error: new Error('Command has timed out')
        });
    }
    write(data, handler, expireTime) {
        return promised_timeout_1.timeout({
            time: expireTime,
            action: () => this._writeAsPromised(data, handler),
            error: new Error('Command has timed out')
        });
    }
    negotiateTLS(config) {
        return promised_timeout_1.timeout({
            time: config.timeout,
            action: () => this._negotiateTLSAsPromised(config),
            error: new Error('Command has timed out')
        });
    }
    isSecure() {
        return this._isSecure;
    }
    parseReplyCode(line) {
        return line ? line.substr(0, 3) : null;
    }
    isLastReply(line) {
        return line ? line.charAt(3) === ' ' : null;
    }
    _createSocket(config, onConnect) {
        const isSecure = this._config.secure;
        const lib = isSecure || config.secure === true ? this._tls : this._net;
        return lib.connect(config, onConnect);
    }
    _connectAsPromised(handler) {
        return new Promise((resolve, reject) => {
            if (this._socket) {
                return reject();
            }
            const options = Object.assign({}, this._config);
            this._socket = this._createSocket(options, () => {
                this._isSecure = !!options.secure; // is TLS
                this._socket.on('close', this._onClose.bind(this));
                this._socket.on('data', this._onReceive.bind(this));
                this._socket.on('end', this._onEnd.bind(this));
                this._socket.on('error', this._onError.bind(this));
                this._socket.on('timeout', this._onTimeout.bind(this));
                this._socket.setEncoding('utf8');
                this._socket.setTimeout(this._config.timeout);
                this._onConnect();
            });
            this._resolveCommand(resolve, reject, handler);
        });
    }
    _closeAsPromised() {
        return new Promise((resolve, reject) => {
            if (!this._socket) {
                return reject();
            }
            this._socket.once('close', resolve);
            this._socket.destroy();
            this._socket = null;
        });
    }
    _writeAsPromised(data, handler) {
        return new Promise((resolve, reject) => {
            if (!this._socket) {
                return reject(new Error('Socket has closed'));
            }
            this._resolveCommand(resolve, reject, handler); // prepare resolver before the channel starts streaming data to the server
            const channel = this._convertToStream(data); // convert command into stream
            channel.pipe(this._createOnSendStream()); // log uploaded data
            channel.pipe(this._socket, { end: false }); // upload to SMTP server
        });
    }
    _negotiateTLSAsPromised(config) {
        return new Promise((resolve, reject) => {
            this._socket.removeAllListeners('close');
            this._socket.removeAllListeners('data');
            this._socket.removeAllListeners('end');
            this._socket.removeAllListeners('error');
            this._socket.removeAllListeners('timeout');
            const options = Object.assign({}, this._config, config, {
                socket: this._socket,
                secure: true
            });
            this._socket = this._createSocket(options, () => {
                this._isSecure = true;
                this._socket.removeAllListeners('error');
                this._socket.on('close', this._onClose.bind(this));
                this._socket.on('data', this._onReceive.bind(this));
                this._socket.on('end', this._onEnd.bind(this));
                this._socket.on('error', this._onError.bind(this));
                this._socket.on('timeout', this._onTimeout.bind(this));
                this._socket.setEncoding('utf8');
                this._socket.setTimeout(this._config.timeout);
                resolve();
            });
            this._socket.on('error', reject);
        });
    }
    _resolveCommand(resolve, reject, handler) {
        let onError = () => null;
        let onLine = () => null;
        const onClose = () => {
            if (this._socket) {
                this._socket.removeListener('error', onError);
            }
            reject(new Error('Socket has closed unexpectedly'));
        };
        onError = (error) => {
            if (this._socket) {
                this._socket.removeListener('close', onClose);
            }
            this._socket.removeListener('close', onClose);
            reject(error);
        };
        onLine = (line) => {
            const isLast = this.isLastReply(line);
            const code = this.parseReplyCode(line);
            const args = { isLast, code };
            Promise.resolve()
                .then(() => {
                if (handler) {
                    handler(line, args);
                }
            })
                .then(() => {
                if (isLast) {
                    resolve(code);
                }
            })
                .catch(reject);
            if (isLast) {
                this._socket.removeListener('close', onClose);
                this._socket.removeListener('error', onError);
            }
        };
        this._socket.once('close', onClose);
        this._socket.once('error', onError);
        this._receiveBuffer.lineSubject.subscribe(onLine);
    }
    _convertToStream(data) {
        if (data.pipe) {
            return data;
        }
        const rs = new this._stream.Readable();
        rs.push(data);
        rs.push(null);
        return rs;
    }
    _createOnSendStream() {
        const logger = new this._stream.PassThrough();
        logger.on('data', (data) => this._onSend(data.toString('utf8')));
        return logger;
    }
    _onClose() {
        this._socket = null;
        this.closeSubject.next();
    }
    _onCommand(line) {
        this.commandSubject.next(line);
    }
    _onConnect() {
        this.connectSubject.next();
    }
    _onEnd() {
        this.endSubject.next();
    }
    _onError(error) {
        this.errorSubject.next(error);
    }
    _onReceive(chunk) {
        this.receiveSubject.next(chunk);
        const lines = this._receiveBuffer.feed(chunk); // feed the buffer with server replies
        for (const line of lines) {
            this._onReply(line);
        }
    }
    _onReply(line) {
        this.replySubject.next(line);
    }
    _onSend(chunk) {
        this.sendSubject.next(chunk);
        const lines = this._sendBuffer.feed(chunk); // feed the buffer with server replies
        for (const line of lines) {
            this._onCommand(line);
        }
    }
    _onTimeout() {
        this.timeoutSubject.next('timeout');
        this.write('QUIT\r\n'); // automatically disconnects
    }
}
exports.SMTPChannel = SMTPChannel;
//# sourceMappingURL=smtp-channel.js.map