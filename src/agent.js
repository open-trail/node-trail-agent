'use strict'

import Module from 'module'

import {Tracer} from 'basictracer'
import cls from 'continuation-local-storage'
import shimmer from 'trail-shimmer'

const CORE_INSTRUMENTS = ['trail-instrument-http']
const FIELD_SESSION_SPAN = 'session_span'
const MODULE_INSTRUMENTED = '__instrumentedByTrail'

export default class TrailAgent extends Tracer {
    constructor() {
        super()

        this.ns = cls.createNamespace('trail')

        this.instrumentedLibs = {}
        this.instrument(CORE_INSTRUMENTS)
        let self = this
        shimmer.wrap(Module, 'Module', '_load', function (load) {
            return function (file) {
                let mod = load.apply(this, arguments)

                self._instrument(file, mod)

                return mod
            }
        })
    }

    instrument(libs) {
        libs.forEach((lib) => {
            let wrapper = require(lib)
            if (!wrapper.target) {
                throw new Error(`Expect module ${lib} have "target" field`)
            }
            this.instrumentedLibs[wrapper.target] = wrapper
        })
    }
    _instrument(target, mod) {
        // require instrument and not instrumented
        if (this.instrumentedLibs[target] && !mod[MODULE_INSTRUMENTED]) {
            mod[MODULE_INSTRUMENTED] = true
            let wrapper = this.instrumentedLibs[target]
            wrapper.wrap(this, mod)
        }
    }

    bind(fn) {
        return this.ns.bind(fn)
    }

    bindEmitter(emitter) {
        return this.ns.bindEmitter(emitter)
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
        this.ns.set(FIELD_SESSION_SPAN, sessionSpan)
        sessionSpan.setTag('type', 'ServerReceive')
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
        span.setTag('type', 'ClientSend')
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
