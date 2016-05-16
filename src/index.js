'use strict'

import tracer from 'basictracer'
import cls from 'continuation-local-storage'

let ns = cls.createNamespace('trail')

module.exports = {
    FORMAT_BINARY: tracer.FORMAT_BINARY,
    FORMAT_TEXT_MAP: tracer.FORMAT_TEXT_MAP,

    configure: tracer.configure.bind(tracer),

    startSpan(...args) {
        let span = tracer.startSpan.apply(tracer, args)
        ns.set('currentSpan', span)
        return span
    },
    getCurrentSpan() {
        return ns.get('currentSpan')
    },
    inject(...args) {
        return tracer.inject.apply(tracer, args)
    },
    join(...args) {
        return tracer.join.apply(tracer, args)
    },
}
