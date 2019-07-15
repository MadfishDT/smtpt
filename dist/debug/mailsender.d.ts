import { SMTPClient } from './smtp-client';
import { Subject } from 'rxjs';
export interface MailSenderStatus {
    kind: string;
    data: any;
}
export declare class Mailsender {
    private _statusSubject;
    private isStopMail;
    private _greet;
    constructor();
    getEmailFormat(subject: string, contents: string): string;
    readonly statusSubject: Subject<MailSenderStatus>;
    greet: string;
    onReject(client: SMTPClient, reason: string): void;
    onProgress(rate: number): void;
    onComplete(): void;
    start(data: any, client: SMTPClient): Promise<"error" | "complete" | "stopped">;
    stop(): void;
    sendMail(name: string, data: string): Promise<"error" | "complete" | "stopped">;
}
