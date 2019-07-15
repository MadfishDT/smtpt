import { SMTPChannel } from './smtp-channel';
export declare class SMTPClient extends SMTPChannel {
    private _extensions;
    private _os;
    private _crypto;
    constructor(config: any);
    connect(timeout?: number): Promise<any>;
    helo(hostname?: string | null, timeout?: number): Promise<any>;
    ehlo(hostname?: string | null, timeout?: number): Promise<any>;
    greet(hostname?: string | null): Promise<any>;
    hasExtension(extension: any): boolean;
    getDataSizeLimit(): number;
    getAuthMechanisms(): any;
    parseEnhancedReplyCode(line: string): string;
    parseReplyText(line: string): string;
    mail(from?: string, timeout?: number): Promise<any>;
    rcpt(to?: string, timeout?: number): Promise<any>;
    noop(timeout?: number): Promise<any>;
    rset(timeout?: number): Promise<any>;
    quit(timeout?: number): Promise<any>;
    data(source: any, sourceSize?: number, timeout?: number): Promise<any>;
    secure(timeout?: number): Promise<boolean>;
    authPlain(username?: string, password?: string, timeout?: number): Promise<any>;
    authLogin(username?: string, password?: string, timeout?: number): Promise<any>;
    authCramMd5(username: string, password: string): Promise<any>;
    _createSMTPResponseError(lines: any): any[];
    _getHostname(): any;
}
