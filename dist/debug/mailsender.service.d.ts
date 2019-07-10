import { SMTPClient } from './smtp-client';
import { Subject } from 'rxjs';
export interface MailSenderStatus {
    kind: string;
    data: any;
}
export declare class MailsenderService {
    private current;
    private _statusSubject;
    private isStopMail;
    constructor();
    getEmailFormat(subject: string, contents: string): string;
    readonly statusSubject: Subject<MailSenderStatus>;
    onReject(client: SMTPClient, reason: string): void;
    onProgress(rate: number): void;
    onComplete(): void;
    start(data: any, client: SMTPClient): Promise<"complete" | "stopped" | "error">;
    stop(): void;
    sendMail(name: string, data: string): Promise<"complete" | "stopped" | "error">;
}
