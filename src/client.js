
'use strict'

import os from 'os'

import cls from 'continuation-local-storage'
import {Tracer} from 'basictracer'

const FIELD_SESSION_SPAN = 'session_span'

export default class TrailClient extends Tracer {

    constructor() {
        super()

        this.ns = cls.createNamespace('trail')
    }

    /**
     * Handle super.join exception on currupt carrier.
     *
     * @override
     */
    join(operationName, format, carrier) {
        let span
        try {
            span = super.join(operationName, format, carrier)
        } catch (err) {
            // Corrupt carrier OR root span will raise exception.
            // Root span will raise exception because carrier don't have
            // required fields: traceId, spanId, sampled
            span = this.startSpan(operationName)
        }
        return span
    }

    bind(fn) {
        this.ns.bind(fn)
    }
    bindEmitter(emitter) {
        this.ns.bindEmitter(emitter)
    }

    /**
     * Start new session.
     * One session have one session span, and  multiple child spans.
     *
     * @param  {string} operationName
     * @param  {string} format
     * @param  {any} carrier
     * @return {Span} Session span.
     */
    start(operationName, format, carrier) {
        let sessionSpan = this.join(operationName, format, carrier)
        sessionSpan.setTag('host', os.hostname())

        this.ns.set(FIELD_SESSION_SPAN, sessionSpan)
        return sessionSpan
    }

    /**
     * Create new child span via session span.
     *
     * @param  {string} operationName
     * @param  {string=} format The format of carrier if present.
     * @param  {Object=} carrier Carrier to carry formated span.
     * @return {Span} Child span.
     */
    fork(operationName, format, carrier) {
        let sessionSpan = this.getSessionSpan()
        let span = this.startSpan(operationName, {
            parent: sessionSpan,
        })
        if (format && carrier) {
            this.inject(span, format, carrier)
        }
        return span
    }

    getSessionSpan() {
        let span = this.ns.get(FIELD_SESSION_SPAN)
        if (!span) {
            // TODO: report missing namespace context
        }
        return span
    }
}