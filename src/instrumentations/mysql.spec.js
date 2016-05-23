'use strict'

import {expect} from 'chai'
import sinon from 'sinon'
import wrap from './mysql'
import Shimmer from '../shimmer'
import TrailClient from '../client'

describe('mysql wrap', function () {
    let client = new TrailClient()
    client.setRecorder(() => {})
    let sandbox

    beforeEach(() => {
        sandbox = sinon.sandbox.create()
    })

    afterEach(() => {
        sandbox.restore()
    })

    it('should wrap Connection and Pool', function () {
        let shimmerWrapStub = sandbox.stub(Shimmer, 'wrap')

        let fakeQueryable = {
            query() {

            },
        }
        let fakeMysql = {
            createConnection() {
                return fakeQueryable
            },
            createPool() {
                return fakeQueryable
            },
        }

        wrap(fakeMysql, null)
        expect(shimmerWrapStub).to.have.been.callCount(0)

        fakeMysql.createConnection()
        fakeMysql.createPool()
        expect(shimmerWrapStub).to.have.been.callCount(2)
    })
})
