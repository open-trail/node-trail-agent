'use strict'

import {expect} from 'chai'
import sinon from 'sinon'
import wrap from './redis'
import Shimmer from '../shimmer'
import consts from '../consts'
import TrailClient from '../client'

describe('redis wrap', function () {
    let client = new TrailClient()
    client.setRecorder(() => {})
    let sandbox

    beforeEach(() => {
        sandbox = sinon.sandbox.create()
    })

    afterEach(() => {
        sandbox.restore()
    })

    it('should wrap redis.RedisClient.prototype.send_command', function () {
        let shimmerWrapStub = sandbox.stub(Shimmer, 'wrap')

        let fakeRedis = {
            RedisClient() {},
        }

        // wrapped as a side effect
        wrap(fakeRedis, null)

        expect(shimmerWrapStub).to.have.been.calledWith(
            fakeRedis.RedisClient.prototype,
            'redis.RedisClient.prototype',
            'send_command'
        )
    })

    it('should record span when command is sent', function () {
        let shimmerWrapStub = sandbox.stub(Shimmer, 'wrap')

        let fakeRedis = {
            RedisClient: function () { // eslint-disable-line
                this.address = 'fakeRedisAddress'
            },
        }
        let span = client.fork('temporary')
        sandbox.spy(span, 'setTag')
        sandbox.spy(span, 'finish')
        sandbox.stub(client, 'fork').returns(span)

        wrap(fakeRedis, client)
        let wrapOp = shimmerWrapStub.args[0][3]

        let fakeRedisClientSend = sandbox.spy((command, args, callback) => {
            callback(new Error('Oops'))
        })
        let RedisClient = fakeRedis.RedisClient
        wrapOp(fakeRedisClientSend).apply(
            new RedisClient(), ['hset', ['abc', 'def']])

        expect(client.fork).to.have.been.calledOnce
        expect(span.setTag).to.have.been.callCount(3)
        expect(span.finish).to.have.been.calledOnce
        expect(span.setTag).to.have.been.calledWith(
            'status', consts.EDGE_STATUS.NOT_OK)
    })
})
