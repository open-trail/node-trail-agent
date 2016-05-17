'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _continuationLocalStorage = require('continuation-local-storage');

var _continuationLocalStorage2 = _interopRequireDefault(_continuationLocalStorage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class TrailClient {
    constructor(tracer) {
        this._tracer = tracer;
        this.FORMAT_BINARY = this._tracer.FORMAT_BINARY;
        this.FORMAT_TEXT_MAP = this._tracer.FORMAT_TEXT_MAP;

        this.ns = _continuationLocalStorage2.default.createNamespace('trail');
    }

    configure() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        this._tracer.configure.apply(this._tracer, args);
    }

    startSpan() {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
        }

        let span = this._tracer.startSpan.apply(this._tracer, args);
        this.ns.set('currentSpan', span);
        return span;
    }
    getCurrentSpan() {
        return this.ns.get('currentSpan');
    }
    inject() {
        for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
            args[_key3] = arguments[_key3];
        }

        return this._tracer.inject.apply(this._tracer, args);
    }
    join() {
        for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
            args[_key4] = arguments[_key4];
        }

        return this._tracer.join.apply(this._tracer, args);
    }

    bind(fn) {
        this.ns.bind(fn);
    }
    bindEmitter(emitter) {
        this.ns.bindEmitter(emitter);
    }
}
exports.default = TrailClient;