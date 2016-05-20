'use strict'

import {expect} from 'chai'
import cls from 'continuation-local-storage'
import TrailClient from './client'

const OPERATION_NAME = 'trailclient-test'
let debug = require('debug')('trail:tests')

describe('client', () => {
    let client = new TrailClient()
    client.setRecorder(() => {})
    let ns = cls.getNamespace('trail')

    beforeEach((done) => {
        ns.run(() => done())
    })

    it('should start session with session span', (done) => {
        let sessionSpan = client.start(OPERATION_NAME, client.FORMAT_TEXT_MAP,
                                       {})
        expect(sessionSpan.spanId.equals(sessionSpan.parentId)).to.be.true
        setTimeout(() => {
            let span = client.getSessionSpan()
            expect(span.spanId.equals(sessionSpan.spanId)).to.be.true
            done()
        }, 10)
    })

    it('should fork a child span', () => {
        let sessionSpan = client.start(OPERATION_NAME, client.FORMAT_TEXT_MAP,
                                       {})
        let childSpan = client.fork(OPERATION_NAME)
        expect(childSpan.parentId.equals(sessionSpan.spanId)).to.be.true
    })

    it('should fork a child span with carrier', () => {
        let sessionSpan = client.start(OPERATION_NAME, client.FORMAT_TEXT_MAP,
                                       {})
        let carrier = {}
        let childSpan = client.fork(OPERATION_NAME, client.FORMAT_TEXT_MAP,
                                    carrier)
        let spanInNewSession = client.join(OPERATION_NAME,
                                           client.FORMAT_TEXT_MAP, carrier)
        expect(childSpan.parentId.equals(sessionSpan.spanId)).to.be.true
        expect(spanInNewSession.parentId.equals(childSpan.spanId)).to.be.true
        expect(Object.keys(carrier).length).to.eql(3)
    })

    it('should return session span in concurrent request', () => {
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
                    let sessionSpan = client.start(OPERATION_NAME,
                                                   client.FORMAT_TEXT_MAP, {})
                    sessionSpan.log('param', param)
                    resolve(param)
                })
            })
        }
        function postHandler(param) {
            return new Promise((resolve) => {
                debug('postHandler start', param, ns)
                let sessionSpan = client.getSessionSpan()
                sessionSpan.finish()
                debug('postHandler end', param, ns)
                resolve([sessionSpan.logs[0].payload, param])
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
                    expect(actual).to.eql(expected)
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
})
