import { SMTPClient } from './smtp-client';
import { Subject } from 'rxjs';

export enum eAuthType {
	plain = 0,
	login,
	crammd5
}

export interface IMailSenderStatus {
    kind: string;
    data: any;
}

export class Mailsender {

    private _statusSubject: Subject<IMailSenderStatus>;
    private isStopMail = false;
    private _greet ='HELLO';
    private _isSecure = false;
	private _userName = '';
	private _userPassword = '';

    constructor() {
        this._statusSubject = new Subject<IMailSenderStatus>();
    }
    
    public getEmailFormat(subject: string, contents: string) {
        return `Subject: ${subject}\n\n${contents}`;
    }

    public get statusSubject() {
        return this._statusSubject;
    }

    public putGreet(greet: string) {
        if (greet && greet.length > 0) {
            this._greet = greet;
        }
        return this;
    }

    public get greet() {
        return this._greet;
    }
    
    public set greet(greet: string) {
        if (greet && greet.length > 0) {
            this._greet = greet;
        }
    }

    public putSecure() {

        this._isSecure = true;
        return this;
    }
	// 3type authentication
	// public authLogin( username: string = null, password: string = null, timeout: number = 0 )
	// public authPlain(username: string = null, password: string = null, timeout: number = 0)
	// public authCramMd5(username: string, password: string)
	// authPlain
	public authentication(username: string, password: string, authType: eAuthType) {
			this._userName = username;
			this._userPassword = password;
	}

    public onReject(client: SMTPClient, reason: string) {
        client.quit();
        this._statusSubject.next({kind: 'stop', data: 0});
    }

    public onProgress(rate: number) {
        this._statusSubject.next({kind: 'progress', data: rate});
    }
    public onComplete() {
        this._statusSubject.next({kind: 'complete', data: 0});
    }
    public async start(data: any, client: SMTPClient) {

        try {
            this.onProgress(10);
            await client.connect();
            if (this.isStopMail) {
                return 'stopped';
            }
            await client.greet('nsuslab.com');
            this.onProgress(20);
            this.onProgress(30);
            await client.secure();
            this.onProgress(40);
            await client.greet('nsuslab.com');
            this.onProgress(50);
            await client.authLogin('crashreport@nsuslab.com', 'ZmfotnL1705!#');
            this.onProgress(60);
            await client.mail('crashreport@nsuslab.com');
            this.onProgress(70);
            await client.rcpt('crashreport@nsuslab.com');
            if (this.isStopMail) {
                return 'stopped';
            }
            this.onProgress(80);
            await client.data(data);
            this.onProgress(90);
            await client.quit();
            this.onProgress(100);
            this.onComplete();
            return 'complete';
        } catch (e) {
            console.log(e);
            return 'error';
        }
    }

    public stop() {
        this.isStopMail = true;
    }

    async sendMail(name: string, data: string) {
        this.isStopMail = false;
        const mailClient = new SMTPClient({
            host: 'smtp.gmail.com',
            port: 587,
        });
        const result = await this.start(data, mailClient);
        return result;
    }
}
