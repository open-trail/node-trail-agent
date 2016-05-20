'use strict'

let Shimmer = require('../shimmer')
let consts = require('../consts')

module.exports = function wrap(redis, client) {
    Shimmer.wrap(redis.RedisClient.prototype, 'redis.RedisClient.prototype', 'send_command', function (original) { // eslint-disable-line
        return function (...args) {
            let command = args[0]
            let last = args[args.length - 1]

            let span = client.fork(command)
            span.setTag('host', this.address)
            span.setTag('protocol', consts.PROTOCOLS.REDIS)

            let wrappedCallback = function (originalCallback) {
                return function (err) {
                    let status = err ?
                        consts.EDGE_STATUS.NOT_OK :
                        consts.EDGE_STATUS.OK
                    span.setTag('status', status)
                    span.finish()

                    return originalCallback.apply(this, arguments)
                }
            }

            if (last && typeof last === 'function') {
                args[args.length - 1] = wrappedCallback(last)
            } else if (Array.isArray(last) &&
                           typeof last[last.length - 1] === 'function') {
                last[last.length - 1] = wrappedCallback(last[last.length - 1])
            } else {
                args.push(wrappedCallback(function () { }))
            }

            return original.apply(this, args)
        }
    })

    return redis
}
