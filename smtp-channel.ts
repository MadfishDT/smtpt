

import { timeout as promiseWithTimeout} from 'promised-timeout';
import { LineBuffer } from './line-buffer';
import { Subject } from 'rxjs';

// it's module work on nodejs or electron
export class SMTPChannel {

    private _config: any;
    private _socket: any;
    private _receiveBuffer: LineBuffer;
    private _sendBuffer: LineBuffer;
    private _isSecure: boolean;
    private _net;
    private _tls;
    private _stream;

    private closeSubject: Subject<any>;
    private commandSubject: Subject<any>;
    private connectSubject: Subject<any>;
    private endSubject: Subject<any>;
    private errorSubject: Subject<any>;
    private receiveSubject: Subject<any>;
    private replySubject: Subject<any>;
    private sendSubject: Subject<any>;
    private timeoutSubject: Subject<any>;

    constructor(config: any) {

        if ((<any>window).require) {
            this._net = (<any>window).require('net');
            this._tls = (<any>window).require('tls');
            this._stream = (<any>window).require('stream');
        }

        this._config = Object.assign({
            host: 'localhost',
            port: 25,
            timeout: 0 // no timeout
        }, config); // class and socket configuration

        this._socket = null; // the socket connecting to the server
        this._receiveBuffer = new LineBuffer(); // for reading server replies in lines
        this._sendBuffer = new LineBuffer(); // for reading socket write commands in lines
        this._isSecure = false;

        this.closeSubject = new Subject<any>();
        this.commandSubject = new Subject<any>();
        this.connectSubject = new Subject<any>();
        this.endSubject = new Subject<any>();
        this.errorSubject = new Subject<any>();
        this.receiveSubject = new Subject<any>();
        this.replySubject = new Subject<any>();
        this.sendSubject = new Subject<any>();
        this.timeoutSubject = new Subject<any>();

    }

    public connect(handler: any, expireTime: number) {
        return promiseWithTimeout({
          time: expireTime,
          action: () => this._connectAsPromised(handler),
          error: new Error('Command has timed out')
        });
    }

    public close(expireTime: number) {
        return promiseWithTimeout({
          time: expireTime,
          action: () => this._closeAsPromised(),
          error: new Error('Command has timed out')
        });
    }

    public write(data: any, handler?: any , expireTime?: number) {
        return promiseWithTimeout({
          time: expireTime,
          action: () => this._writeAsPromised(data, handler),
          error: new Error('Command has timed out')
        });
    }

    negotiateTLS(config: any) {
        return promiseWithTimeout({
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

    _createSocket(config: any, onConnect: any) {
        const isSecure = this._config.secure;
        const lib = isSecure || config.secure === true ? this._tls : this._net;

        return lib.connect(config, onConnect);
    }

    _connectAsPromised(handler?: any) {
        return new Promise((resolve, reject) => {
          if (this._socket) {
            return resolve();
          }

          const options = Object.assign({}, this._config);

          this._socket = this._createSocket(options, () => {// when connection to the server succeeds
            this._isSecure = !!options.secure; // is TLS
            this._socket.on('close',this._onClose.bind(this));
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
            return resolve();
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
          channel.pipe(this._socket, {end: false}); // upload to SMTP server
        });
    }

    _negotiateTLSAsPromised(config: any) {
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

    _resolveCommand(resolve, reject, handler) { // handling request

        let onError: any = () => null;
        let onLine: any = () => null;

        const onClose = () => { // socket unexpectedly closed
            if (this._socket) {
                this._socket.removeListener('error', onError);
            }
          reject(new Error('Socket has closed unexpectedly'));
        };

        onError = (error) => { // socket write error
          if (this._socket) {
            this._socket.removeListener('close', onClose);
          }
          this._socket.removeListener('close', onClose);
          reject(error);
        };

        onLine = (line) => { // handling replies
            const isLast = this.isLastReply(line);
            const code = this.parseReplyCode(line);
            const args = {isLast, code};

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
