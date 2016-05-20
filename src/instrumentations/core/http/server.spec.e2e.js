'use strict'

import http from 'http'
import {expect} from 'chai'
import Shimmer from '../../../shimmer'
import wrapHTTP from '../http'
import TrailClient from '../../../client'

describe('http.Server e2e', () => {
    let client = new TrailClient()
    const OPERATION_NAME = 'trailclient-http/server-test'
    const HTTP_PORT = 6471
    let server
    let records

    beforeEach(() => {
        records = []
        client.setRecorder((span) => {
            records.push(span)
        })
        wrapHTTP(http, client)
        server = http.createServer((request, response) => {
            response.end('hello world')
        })
        server.listen(HTTP_PORT)
    })

    afterEach(() => {
        server.close()
        Shimmer.unwrapAll()
    })

    it('should record session span', (done) => {
        let path = '/session-span'
        remote.request({port: HTTP_PORT, path}, () => {
            expect(records.length).to.eql(1)
            let [span] = records
            expect(span.operationName).to.eql(path)
            expect(span.tags.protocol).to.eql('http')
            expect(span.tags.statusCode).to.eql(200)
            done()
        })
    })

    it('should join carrier in new session', (done) => {
        let rootSpan = client.startSpan(OPERATION_NAME)
        let headers = {}
        client.inject(rootSpan, client.FORMAT_TEXT_MAP, headers)

        let path = '/span-join'
        remote.request({port: HTTP_PORT, path, headers}, () => {
            let [span] = records
            expect(span.operationName).to.eql(path)
            expect(rootSpan.spanId.equals(span.parentId)).to.be.true
            done()
        })
    })
})
