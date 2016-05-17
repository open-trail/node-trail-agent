'use strict'

import cls from 'continuation-local-storage'

import trail from '..'

const OPERATION_NAME = 'basictracer-test'
const ANOTHER_OPERATION_NAME = 'another-basictracer-test'

let debug = require('debug')('trail:tests')
trail.configure()
let ns = cls.getNamespace('trail')

describe('Client', () => {
    beforeEach((done) => {
        ns.run(() => done())
    })

    it('should create root span', () => {
        let rootSpan = trail.startSpan({operationName: OPERATION_NAME})
        let imp = rootSpan.imp()
        should(imp.traceId).be.ok()
        should(imp.spanId).be.ok()
        should(imp.parentId.equals(imp.spanId)).be.ok()
        should(imp.sampled).be.type('boolean')
        should(imp.baggage).be.type('object')
    })

    it('should return current span in concurrent request', () => {
        function request(param) {
            return new Promise((resolve) => {
                debug('request start', param, ns)
                resolve(param)
            })
        }
        function preHandler(param) {
            return new Promise((resolve) => {
                ns.run(() => {
                    debug('preHandler start', param, ns)
                    let span = trail.startSpan({operationName: OPERATION_NAME})
                    span.log({
                        event: 'param',
                        payload: param,
                    })
                    debug('preHandler end', param, ns)
                    resolve(param)
                })
            })
        }
        function postHandler(param) {
            return new Promise((resolve) => {
                debug('postHandler start', param, ns)
                let span = trail.getCurrentSpan()
                let imp = span.imp()
                span.finish()
                debug('postHandler end', param, ns)
                resolve([imp.logs[0].payload, param])
            })
        }
        function procedure(param, timeouts) {
            return request(param)
                .then(delay(timeouts[0]))
                .then(preHandler)
                .then(delay(timeouts[1]))
                .then(postHandler)
                .then(([actual, expected]) => {
                    debug('request end', expected, ns)
                    should(actual).eql(expected)
                })
        }
        function delay(timeout) {
            return (param) => {
                return new Promise((resolve) => {
                    debug('delay start', param, ns)
                    setTimeout(() => {
                        debug('delay end', param, ns)
                        resolve(param)
                    }, timeout)
                })
            }
        }

        // 1. First request create span at 10ms
        // 2. Second request create span at 15ms
        // 3. First request get current span at 20ms
        // 4. Second request get current span at 25ms
        // If thread local storage doesn't works, step 3 will get another
        // request's span.
        return Promise.all([
            procedure('AAA', [10, 10]),
            procedure('BBB', [15, 10]),
        ])
    })

    it('should inject context into carrier', () => {
        let parentSpan = trail.startSpan({operationName: OPERATION_NAME})
        let carrier = {}
        trail.inject(parentSpan, trail.FORMAT_TEXT_MAP, carrier)
        should(Object.keys(carrier).length).eql(3)
    })

    it('should join receving span', () => {
        // inject
        let parentSpan = trail.startSpan({operationName: OPERATION_NAME})
        let carrier = {key: 'value'}
        trail.inject(parentSpan, trail.FORMAT_TEXT_MAP, carrier)

        // join
        let span = trail.join(ANOTHER_OPERATION_NAME, trail.FORMAT_TEXT_MAP,
                               carrier)

        let parentImp = parentSpan.imp()
        let imp = span.imp()
        should(imp.traceId.equals(parentImp.traceId)).be.ok()
        should(imp.spanId.equals(parentImp.spanId)).be.not.ok()
        should(imp.parentId.equals(parentImp.spanId)).be.ok()
        should(imp.sampled).eql(parentImp.sampled)
        should(imp.baggage).eql(parentImp.baggage)
    })

    it('should able to in process span creation', () => {
        let parentSpan = trail.startSpan({operationName: OPERATION_NAME})
        let span = trail.startSpan({
            operationName: ANOTHER_OPERATION_NAME,
            parent: parentSpan,
        })
        let parentImp = parentSpan.imp()
        let imp = span.imp()
        should(imp.traceId.equals(parentImp.traceId)).be.ok()
        should(imp.spanId.equals(parentImp.spanId)).not.be.ok()
        should(imp.parentId.equals(parentImp.spanId)).be.ok()
        should(imp.sampled).eql(parentImp.sampled)
        should(imp.baggage).be.type('object')
    })
})
