
import { Subject } from 'rxjs';

export class LineBuffer {

    private _buffer: any;
    private _lineSubject: Subject<any>;
    private _drainSubject: Subject<any>;

    constructor() {
        this._buffer = '';
        this._lineSubject = new Subject<any>();
        this._drainSubject = new Subject<any>();
    }

    public feed(chunk) {
        this._buffer += (chunk || '').toString('binary');

        let lines = this._buffer.split(/\r?\n/);
        if (lines.length > 1) {
        this._buffer = lines.pop(); // chunk for the next round

        lines = lines.filter(v => !!v);
        lines.forEach(l => {
                this._lineSubject.next(l);
            }
        );
        return lines;
        }
        return [];
    }
    get lineSubject() {
        return this._lineSubject;
    }
    get drainSubject() {
        return this._drainSubject;
    }
    public drain() {
        this._buffer = '';
        this._drainSubject.next();
    }

}
