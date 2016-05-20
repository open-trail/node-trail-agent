'use strict'

import {expect} from 'chai'
import sinon from 'sinon'
import cls from 'continuation-local-storage'
import wrapRequest from './request'
import TrailClient from '../../../client'

describe('http.request wrap', () => {
    let client = new TrailClient()
    let ns = cls.getNamespace('trail')
    let sandbox
    let records

    beforeEach((done) => {
        ns.run(() => {
            records = []
            client.setRecorder((span) => {
                records.push(span)
            })
            sandbox = sinon.sandbox.create()
            done()
        })
    })

    afterEach(() => {
        sandbox.restore()
    })

    it('should invoke client.fork', () => {
        sandbox.spy(client, 'fork')
        let request = wrapRequest(() => {
            return {on() {}}
        }, client)
        request('/')

        expect(client.fork).to.be.calledOnce
    })

    it('should record client request and inject into carrier', (done) => {
        let onResponse
        let request = (options) => {
            expect(Object.keys(options.headers).length).to.eql(3)
            return {
                on(type, cb) {
                    if (type === 'response') {
                        onResponse = cb
                    }
                },
            }
        }
        request = wrapRequest(request, client)

        let path = '/client-request'
        request({path})
        let delay = 10
        setTimeout(() => {
            onResponse({statusCode: 200})
            let [span] = records
            expect(span.operationName).to.eql(path)
            expect(span.tags.protocol).to.eql('http')
            expect(span.duration).to.not.below(delay)
            done()
        }, delay)

    })
})
