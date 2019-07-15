import { Subject } from 'rxjs';
export declare class LineBuffer {
    private _buffer;
    private _lineSubject;
    private _drainSubject;
    constructor();
    feed(chunk: any): any;
    readonly lineSubject: Subject<any>;
    readonly drainSubject: Subject<any>;
    drain(): void;
}
