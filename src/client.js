'use strict'
import cls from 'continuation-local-storage'

export default class TrailClient {
    constructor(tracer) {
        this._tracer = tracer
        this.FORMAT_BINARY = this._tracer.FORMAT_BINARY
        this.FORMAT_TEXT_MAP = this._tracer.FORMAT_TEXT_MAP

        this.ns = cls.createNamespace('trail')
    }

    configure(...args) {
        this._tracer.configure.apply(this._tracer, args)
    }

    startSpan(...args) {
        let span = this._tracer.startSpan.apply(this._tracer, args)
        this.ns.set('currentSpan', span)
        return span
    }
    getCurrentSpan() {
        return this.ns.get('currentSpan')
    }
    inject(...args) {
        return this._tracer.inject.apply(this._tracer, args)
    }
    join(...args) {
        return this._tracer.join.apply(this._tracer, args)
    }

    bind(fn) {
        this.ns.bind(fn)
    }
    bindEmitter(emitter) {
        this.ns.bindEmitter(emitter)
    }
}
