import { SMTPClient } from './smtp-client';
import { Subject, from } from 'rxjs';

export interface MailSenderStatus {
    kind: string;
    data: any;
}

@Injectable({
  providedIn: 'root'
})
export class MailsenderService {

    private current: SMTPClient;
    private _statusSubject: Subject<MailSenderStatus>;
    private isStopMail = false;
    constructor() {
        this._statusSubject = new Subject<MailSenderStatus>();
    }

    public getEmailFormat(subject: string, contents: string) {
        return `Subject: ${subject}\n\n${contents}`;
    }

    public get statusSubject() {
        return this._statusSubject;
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
