'use strict'

import http from 'http'
import {expect} from 'chai'
import cls from 'continuation-local-storage'
import Shimmer from '../../../shimmer'
import wrapHTTP from '../http'
import TrailClient from '../../../client'

describe('http.request e2e', () => {
    let client = new TrailClient()
    let ns = cls.getNamespace('trail')
    const OPERATION_NAME = 'trailclient-http/server-test'
    const HTTP_PORT = 6471
    let records

    beforeEach(() => {
        records = []
        client.setRecorder((span) => {
            records.push(span)
        })
        remote.listen(HTTP_PORT)
        wrapHTTP(http, client)
    })

    afterEach(() => {
        remote.close()
        Shimmer.unwrapAll()
    })

    it('should record client request as standlone utility', (done) => {
        let path = '/standalone-client-request'
        http.get({port: HTTP_PORT, path}, (res) => {
            res.on('data', () => {
                let [span] = records
                expect(span.operationName).to.eql(path)
                expect(span.tags.protocol).to.eql('http')
                done()
            })
        })
    })

    it('should record request as part of service call', (done) => {
        ns.run(() => {
            let path = '/session-client-request'
            let sessionSpan = client.start(OPERATION_NAME)
            http.get({port: HTTP_PORT, path}, (res) => {
                res.on('data', () => {
                    let [span] = records
                    expect(span.parentId.equals(sessionSpan.spanId)).to.be.true
                    done()
                })
            })
        })
    })
})
