import { SMTPClient } from './smtp-client';
import { Subject } from 'rxjs';

export enum eAuthType {
    plain = 0,
    login,
    crammd5
}


export enum eMailSenderStatus {
    connecting = 0,
    connected,
    greeting,
    secure,
    auth,
    mail,
    receipt,
    data,
    quit,
    complete,
    error
}

export interface IMailSenderStatus {
    kind: eMailSenderStatus;
    data: any;
    count: number;
}


export class Mailsender {

    private _statusSubject: Subject<IMailSenderStatus>;
    private isStopMail = false;
    private _greet ='HELLO';
    private _isSecure = false;
    private _userName = '';
    private _userPassword = '';
    private _from = '';
    private _to = '';
    private _authType = eAuthType.plain;

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

    public get authType() {
        return this._authType;
    }

    public set userName(username: string) {
        this._userName = username;
    }

    public set password(password: string) {
        this._userPassword = password;
    }
    
    public set greet(greet: string) {
        if (greet && greet.length > 0) {
            this._greet = greet;
        }
    }

    public set from(from: string) {

    }

    public activateSecure() {
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
        this._authType = authType;
    }

    private getStatus(kind: eMailSenderStatus, count: number =0, data: any = null): IMailSenderStatus {
        return {kind: kind, count: count, data: data};
    }

    public async start(data: any, client: SMTPClient) {

        let count = 0;
        try {
            this.statusSubject.next(this.getStatus(eMailSenderStatus.connecting, count++));

            try {
                await client.connect();
                this.statusSubject.next(this.getStatus(eMailSenderStatus.connected, count++));
            } catch(e) {
                this.statusSubject.next(this.getStatus(eMailSenderStatus.error, count, e));
                return;
            }
            
            this.statusSubject.next(this.getStatus(eMailSenderStatus.connected, count++));

            this.statusSubject.next(this.getStatus(eMailSenderStatus.greeting, count++));
            try {
                await client.greet(this.greet);
            } catch(e) {
                this.statusSubject.next(this.getStatus(eMailSenderStatus.error, count, e));
                return;
            }
           
            if(this._isSecure) {
                this.statusSubject.next(this.getStatus(eMailSenderStatus.secure, count++));
                try {
                    await client.secure();
                } catch(e) {
                    this.statusSubject.next(this.getStatus(eMailSenderStatus.error, count, e));
                    return;
                }
            }
            
            if(this._isSecure) {
                this.statusSubject.next(this.getStatus(eMailSenderStatus.greeting, count++));
                try {
                    await client.greet(this.greet);
                } catch(e) {
                    this.statusSubject.next(this.getStatus(eMailSenderStatus.error, count, e));
                    return;
                }
            }

            this.statusSubject.next(this.getStatus(eMailSenderStatus.auth, count++));
            try {
                await this.runAthentication(client);
            } catch(e) {
                this.statusSubject.next(this.getStatus(eMailSenderStatus.error, count, e));
                return;
            }
            
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

    public runAthentication(client: SMTPClient) {
        switch (this.authType) {
            case eAuthType.login:
                return client.authLogin(this.userName, this.password, 5000);
            case eAuthType.plain:
                return client.authPlain(this.userName,this.password, 5000);
            case eAuthType.crammd5:
                return client.authCramMd5(this.userName,this.password, 5000);
            default:
                return null;
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
