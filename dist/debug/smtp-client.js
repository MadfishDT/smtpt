"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smtp_channel_1 = require("./smtp-channel");
class SMTPClient extends smtp_channel_1.SMTPChannel {
    constructor(config) {
        super(config);
        this._extensions = [];
        if (window.require) {
            this._os = window.require('os');
            this._crypto = window.require('crypto');
        }
        this._extensions = []; // SMTP server extensions
    }
    /*
    * Returns a Promise which connects to the SMTP server and starts socket
    * I/O activity. We can abort the operating after a certain number of
    * milliseconds by passing the optional `timeout` parameter.
    */
    connect(timeout = 0) {
        const lines = [];
        const handler = (line) => lines.push(line);
        return super.connect(handler, timeout).then((code) => {
            if (code.charAt(0) === '2') {
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    /*
    * Returns a Promise which sends the HELO command to the server. We can abort
    * the operating after a certain number of milliseconds by passing the optional
    * `timeout` parameter.
    */
    helo(hostname = null, timeout = 0) {
        if (!hostname) {
            hostname = this._getHostname();
        }
        const lines = [];
        const handler = (line) => lines.push(line);
        const command = `HELO ${hostname}\r\n`;
        return super.write(command, handler, timeout).then((code) => {
            if (code.charAt(0) === '2') {
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    /*
    * Returns a Promise which sends the EHLO command to the server and collects
    * information about available SMTP server extensions. We can abort the
    * operating after a certain number of milliseconds by passing the optional
    * `timeout` parameter.
    */
    ehlo(hostname = null, timeout = 0) {
        if (!hostname) {
            hostname = this._getHostname();
        }
        const lines = [];
        const handler = (line) => lines.push(line);
        const command = `EHLO ${hostname}\r\n`;
        return super.write(command, handler, timeout).then((code) => {
            if (code.charAt(0) === '2') {
                this._extensions = [];
                this._extensions = lines.slice(1).map(l => this.parseReplyText(l));
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    /*
    * Returns a Promise which sends the EHLO command to the server or HELO command
    * if the EHLO isn't successful. We can abort the operating after a certain
    * number of milliseconds by passing the optional `timeout` parameter.
    */
    greet(hostname = null) {
        return this.ehlo(hostname).catch(() => this.helo(hostname));
    }
    /*
    * Returns `true` if the provided extension name is supporter by the remote
    * SMTP server.
    */
    hasExtension(extension) {
        return !!this._extensions.find(e => e.split(' ')[0] === extension);
    }
    /*
    * Returns an email size limit in bytes.
    */
    getDataSizeLimit() {
        const extension = this._extensions.find((e) => e.split(' ')[0] === 'SIZE');
        if (extension) {
            return parseInt(extension.split(' ')[1], 10);
        }
        else {
            return 0;
        }
    }
    /*
    * Returns a list of supported authentication mechanisms.
    */
    getAuthMechanisms() {
        const extension = this._extensions.find((e) => e.split(' ')[0] === 'AUTH');
        if (extension) {
            return extension.split(' ').filter((e) => !!e).map((e) => e.trim().toUpperCase()).slice(1);
        }
        else {
            return [];
        }
    }
    /*
    * Returns the enhanced reply code of the provided reply line.
    *
    * NOTES: According to the rfc2034 specification, the text part of all 2xx,
    * 4xx, and 5xx SMTP responses other than the initial greeting and any response
    * to HELO or EHLO are prefaced with a status code as defined in RFC 1893. This
    * status code is always followed by one or more spaces.
    */
    parseEnhancedReplyCode(line) {
        const isSupported = this.hasExtension('ENHANCEDSTATUSCODES');
        return isSupported ? line.substr(4).split(' ', 2)[0] : null;
    }
    /*
    * Returns the text part of a reply line.
    */
    parseReplyText(line) {
        const isSupported = this.hasExtension('ENHANCEDSTATUSCODES');
        if (isSupported) {
            return line.substr(4).split(/[\s](.+)?/, 2)[1];
        }
        else {
            return line.substr(4);
        }
    }
    /*
    * Returns a Promise which sends the MAIL command to the server. We can abort
    * the operating after a certain number of milliseconds by passing the optional
    * `timeout` parameter.
    */
    mail(from = null, timeout = 0) {
        const lines = [];
        const handler = (line) => lines.push(line);
        const command = `MAIL FROM:<${from}>\r\n`;
        return super.write(command, handler, timeout).then((code) => {
            if (code.charAt(0) === '2') {
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    /*
    * Returns a Promise which sends the RCPT command to the server. We can abort
    * the operating after a certain number of milliseconds by passing the optional
    * `timeout` parameter.
    */
    rcpt(to = null, timeout = 0) {
        const lines = [];
        const handler = (line) => lines.push(line);
        const command = `RCPT TO:<${to}>\r\n`;
        return super.write(command, handler, timeout).then((code) => {
            if (code.charAt(0) === '2') {
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    /*
    * Returns a Promise which sends the NOOP command to the server. We can abort
    * the operating after a certain number of milliseconds by passing the optional
    * `timeout` parameter.
    */
    noop(timeout = 0) {
        const lines = [];
        const handler = (line) => lines.push(line);
        const command = `NOOP\r\n`;
        return super.write(command, handler, timeout).then((code) => {
            if (code.charAt(0) === '2') {
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    /*
    * Returns a Promise which sends the RSET command to the server. We can abort
    * the operating after a certain number of milliseconds by passing the optional
    * `timeout` parameter.
    */
    rset(timeout = 0) {
        const lines = [];
        const handler = (line) => lines.push(line);
        const command = `RSET\r\n`;
        return super.write(command, handler, timeout).then((code) => {
            if (code.charAt(0) === '2') {
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    /*
    * Returns a Promise which sends the QUIT command to the server. We can abort
    * the operating after a certain number of milliseconds by passing the optional
    * `timeout` parameter.
    */
    quit(timeout = 0) {
        const lines = [];
        const handler = (line) => lines.push(line);
        const command = `QUIT\r\n`;
        return super.write(command, handler, timeout).then((code) => {
            if (code.charAt(0) === '2') {
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    /*
    * Returns a Promise which sends the DATA command to the server, streams the
    * `source` to the server and finalize the process with the final `.` which
    * enqueue the email. We can abort the operating after a certain number of
    * milliseconds by passing the optional `timeout` parameter.
    */
    data(source, sourceSize = 0, timeout = 0) {
        const sizeLimit = this.getDataSizeLimit();
        if (sourceSize > sizeLimit) {
            throw new Error(`Message size exceeds the allowable limit (${sizeLimit} bytes)`);
        }
        let lines = [];
        const handler = (line) => lines.push(line);
        const command = `DATA\r\n`;
        return super.write(command, handler, timeout).then((code) => {
            if (code.charAt(0) !== '3') {
                throw this._createSMTPResponseError(lines);
            }
            else {
                lines = [];
                return super.write(`${source}\r\n.\r\n`, handler, timeout);
            }
        }).then((code) => {
            if (code.charAt(0) === '2') {
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    /*
    * Returns a Promise which sends the STARTTLS command to the server and
    * upgrades the connection to TLS. We can abort the operating after a certain
    * number of milliseconds by passing the optional `timeout` parameter.
    */
    secure(timeout = 0) {
        const isPossible = this.hasExtension('STARTTLS');
        if (!isPossible) {
            throw new Error(`SMTP server does not support TLS`);
        }
        const lines = [];
        const handler = (line) => lines.push(line);
        const command = `STARTTLS\r\n`;
        return super.write(command, handler, timeout).then((code) => {
            if (code.charAt(0) !== '2') {
                throw this._createSMTPResponseError(lines);
            }
            else {
                return super.negotiateTLS(timeout);
            }
        }).then(() => {
            return true;
        });
    }
    /*
    * Returns a Promise which sends the AUTH PLAIN commands to the server. We can
    * abort the operating after a certain number of milliseconds by passing the
    * optional `timeout` parameter.
    *
    * NOTES: The PLAIN authentication mechanism is explaind in rfc4954 and rfc4616.
    */
    authPlain(username = null, password = null, timeout = 0) {
        const mechanisms = this.getAuthMechanisms();
        if (mechanisms.indexOf('PLAIN') === -1) {
            //throw new Error(`SMTP server does not support the PLAIN authentication mechanism`);
        }
        const lines = [];
        const handler = (line) => lines.push(line);
        const token = Buffer.from(`\u0000${username}\u0000${password}`, 'utf-8').toString('base64');
        const command = `AUTH PLAIN ${token}\r\n`;
        return super.write(command, handler, timeout).then((code) => {
            if (code.charAt(0) === '2') {
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    /*
    * Returns a Promise which sends the AUTH LOGIN commands to the server. We can
    * abort the operating after a certain number of milliseconds by passing the
    * optional `timeout` parameter.
    *
    * NOTES: The LOGIN authentication mechanism is not covered by rfc documents.
    */
    authLogin(username = null, password = null, timeout = 0) {
        const mechanisms = this.getAuthMechanisms();
        if (mechanisms.indexOf('LOGIN') === -1) {
            throw new Error(`SMTP server does not support the LOGIN authentication mechanism`);
        }
        let lines = [];
        const handler = (line) => lines.push(line);
        const command = `AUTH LOGIN\r\n`;
        return super.write(command, handler, timeout).then(() => {
            if (lines[0] !== '334 VXNlcm5hbWU6') {
                throw this._createSMTPResponseError(lines);
            }
            else {
                lines = [];
                const token = Buffer.from(username, 'utf-8').toString('base64');
                return super.write(`${token}\r\n`, handler, timeout);
            }
        }).then(() => {
            if (lines[0] !== '334 UGFzc3dvcmQ6') {
                throw this._createSMTPResponseError(lines);
            }
            else {
                lines = [];
                const token = Buffer.from(password, 'utf-8').toString('base64');
                return super.write(`${token}\r\n`, handler, timeout);
            }
        }).then((code) => {
            if (code.charAt(0) === '2') {
                return code;
            }
            else {
                throw this._createSMTPResponseError(lines);
            }
        });
    }
    authCramMd5(username, password) {
        return super.write(`AUTH CRAM-MD5\r\n`).then(code => {
            const challengeMatch = code.match(/^334\s+(.+)$/);
            let challengeString = '';
            if (!challengeMatch) {
                return null;
            }
            else {
                challengeString = challengeMatch[1];
            }
            // Decode from base64
            const base64decoded = Buffer.from(challengeString, 'base64').toString('ascii');
            const hmac_md5 = this._crypto.createHmac('md5', password);
            hmac_md5.update(base64decoded);
            const hex_hmac = hmac_md5.digest('hex');
            const prepended = username + ' ' + hex_hmac;
            return super.write(Buffer.from(prepended).toString('base64'));
        });
    }
    /*
    * Returns a new SMTPResponseError instance populated with information from the
    * provided reply lines.
    */
    _createSMTPResponseError(lines) {
        const line = lines[lines.length - 1];
        const code = super.parseReplyCode(line);
        const enhancedCode = this.parseEnhancedReplyCode(line);
        const message = lines.map(l => this.parseReplyText(l)).join(' ').replace(/\s\s+/g, ' ');
        return [message, code, enhancedCode];
    }
    /*
    * Returns a hostname of a client machine.
    *
    * NOTES: According to rfc2821, the domain name given in the EHLO command must
    * be either a primary host name (a domain name that resolves to an A RR) or,
    * if the host has no name, an address IPv4/IPv6 literal enclosed by brackets
    * (e.g. [192.168.1.1]).
    */
    _getHostname() {
        let host = this._os.hostname() || '';
        if (host.indexOf('.') < 0) { // ignore if not FQDN
            host = '[127.0.0.1]';
        }
        else if (host.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) { // IP mut be enclosed in []
            host = `[${host}]`;
        }
        return host;
    }
}
exports.SMTPClient = SMTPClient;
//# sourceMappingURL=smtp-client.js.map