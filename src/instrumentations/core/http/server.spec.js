'use strict'

import {expect} from 'chai'
import sinon from 'sinon'
import cls from 'continuation-local-storage'
import wrapListener from './server'
import TrailClient from '../../../client'

describe('http.Server wrap', () => {
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

    it('should create session span via client', () => {
        sandbox.spy(client, 'start')

        let listener = wrapListener(() => {}, client)
        listener({url: '/', headers: {}}, {once: () => {}})

        expect(client.start).to.be.calledOnce
    })

    it('should record span during request life cycle', (done) => {
        let listener = wrapListener(() => {}, client)
        let onFinish

        let request = {
            headers: {
                'user-agent': '007',
            },
            url: '/',
        }
        let response = {
            once(name, cb) {
                if (name === 'finish') {
                    onFinish = cb
                }
            },
            statusCode: 200,
        }

        listener(request, response)

        expect(records.length).to.eql(0)
        // Mimic finish event
        let delay = 10
        setTimeout(() => {
            onFinish()

            expect(records.length).to.eql(1)
            let [span] = records
            expect(span.operationName).to.eql('/')
            expect(span.tags.protocol).to.eql('http')
            expect(span.tags.statusCode).to.eql(200)
            expect(span.duration).to.not.below(delay)

            done()
        }, delay)
    })
})
