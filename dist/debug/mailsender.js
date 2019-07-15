"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const smtp_client_1 = require("./smtp-client");
const rxjs_1 = require("rxjs");
class Mailsender {
    constructor() {
        this.isStopMail = false;
        this._greet = 'HELLO';
        this._statusSubject = new rxjs_1.Subject();
    }
    getEmailFormat(subject, contents) {
        return `Subject: ${subject}\n\n${contents}`;
    }
    get statusSubject() {
        return this._statusSubject;
    }
    set greet(greet) {
        if (greet && greet.length > 0) {
            this._greet = greet;
        }
    }
    get greet() {
        return this._greet;
    }
    onReject(client, reason) {
        client.quit();
        this._statusSubject.next({ kind: 'stop', data: 0 });
    }
    onProgress(rate) {
        this._statusSubject.next({ kind: 'progress', data: rate });
    }
    onComplete() {
        this._statusSubject.next({ kind: 'complete', data: 0 });
    }
    start(data, client) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.onProgress(10);
                yield client.connect();
                if (this.isStopMail) {
                    return 'stopped';
                }
                yield client.greet('nsuslab.com');
                this.onProgress(20);
                this.onProgress(30);
                yield client.secure();
                this.onProgress(40);
                yield client.greet('nsuslab.com');
                this.onProgress(50);
                yield client.authLogin('crashreport@nsuslab.com', 'ZmfotnL1705!#');
                this.onProgress(60);
                yield client.mail('crashreport@nsuslab.com');
                this.onProgress(70);
                yield client.rcpt('crashreport@nsuslab.com');
                if (this.isStopMail) {
                    return 'stopped';
                }
                this.onProgress(80);
                yield client.data(data);
                this.onProgress(90);
                yield client.quit();
                this.onProgress(100);
                this.onComplete();
                return 'complete';
            }
            catch (e) {
                console.log(e);
                return 'error';
            }
        });
    }
    stop() {
        this.isStopMail = true;
    }
    sendMail(name, data) {
        return __awaiter(this, void 0, void 0, function* () {
            this.isStopMail = false;
            const mailClient = new smtp_client_1.SMTPClient({
                host: 'smtp.gmail.com',
                port: 587,
            });
            const result = yield this.start(data, mailClient);
            return result;
        });
    }
}
exports.Mailsender = Mailsender;
//# sourceMappingURL=mailsender.js.map