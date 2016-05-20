'use strict'

import {expect} from 'chai'
import redis from 'redis'
import wrap from './redis'
import Shimmer from '../shimmer'
import TrailClient from '../client'

describe('redis e2e', () => {
    let client = new TrailClient()
    let records
    let redisClient

    beforeEach(() => {
        records = []
        client.setRecorder((span) => {
            records.push(span)
        })
        wrap(redis, client)
        redisClient = redis.createClient({no_ready_check: true}) // eslint-disable-line
    })

    afterEach(() => {
        Shimmer.unwrapAll()
    })

    it('should instrument operation test #1', (done) => {
        redisClient.sadd('x', 6, () => {
            let [, span] = records
            expect(span.operationName).to.eql('sadd')
            done()
        })
    })

    it('should instrument operation test #2', (done) => {
        let tasks = []
        let index
        for (index = 0; index < 3; index++) {
            tasks.push(sadd(index))
        }
        Promise.all(tasks)
            .then(() => {
                // TODO: why send_command receive double requests? All these tests have the same problem
                expect(records.length).to.eql(index * 2)
                done()
            })
            .catch(done)

        function sadd(value) {
            return new Promise((resolve, reject) => {
                redisClient.sadd('x', value, (err, res) => {
                    if (err) {
                        return reject(err)
                    }
                    resolve(res)
                })
            })
        }
    })

    it('should work with multi', (done) => {
        redisClient.multi()
            .sadd('x', 6)
            .srem('x', 7)
            .exec(() => {
                expect(records.length).to.eql(4 * 2)
                done()
            })
    })
})
