"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
class LineBuffer {
    constructor() {
        this._buffer = '';
        this._lineSubject = new rxjs_1.Subject();
        this._drainSubject = new rxjs_1.Subject();
    }
    feed(chunk) {
        this._buffer += (chunk || '').toString('binary');
        let lines = this._buffer.split(/\r?\n/);
        if (lines.length > 1) {
            this._buffer = lines.pop(); // chunk for the next round
            lines = lines.filter(v => !!v);
            lines.forEach(l => {
                this._lineSubject.next(l);
            });
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
    drain() {
        this._buffer = '';
        this._drainSubject.next();
    }
}
exports.LineBuffer = LineBuffer;
//# sourceMappingURL=line-buffer.js.map