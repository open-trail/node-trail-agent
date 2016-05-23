'use strict'

let Shimmer = require('../shimmer')
let consts = require('../consts')

let CONNECTION_OPERATIONS = [
    'connect',
    'query',
    'end',
]

let POOL_OPERATIONS = [
    'getConnection',
    'query',
    'destroy',
]

// TODO: return promise
function decideWrap(original, args, client, methodName) {
    if (methodName === 'query') {
        let span = client.fork(args[0])
        span.setTag('protocol', consts.PROTOCOLS.MYSQL)
        let connectionConfig = this.config.connectionConfig ?
            this.config.connectionConfig :
            this.config
        if (connectionConfig.host) {
            span.setTag('host', connectionConfig.host)
        }
        if (connectionConfig.database) {
            span.setTag('database', connectionConfig.database)
        }

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
        let last = args[args.length - 1]

        if (last && typeof last === 'function') {
            args[args.length - 1] = wrappedCallback(last)
        } else if (Array.isArray(last) &&
                   typeof last[last.length - 1] === 'function') {
            let lastOfLast = last.length - 1
            args[args.length - 1][lastOfLast] =
                wrappedCallback(last[lastOfLast])
        } else {
            args.push(wrappedCallback(function () { }))
        }
    }
    return original.apply(this, args)
}

module.exports = function (mysql, client) {
    let _createConnection = mysql.createConnection
    let _createPool = mysql.createPool

    mysql.createConnection = function (config) {
        let Connection = _createConnection(config)

        Shimmer.wrap(Connection, 'Connection', CONNECTION_OPERATIONS,
            function (original, name) {
                return function (...args) {
                    let last = args.length - 1
                    let callback = args[last]

                    if (callback === 'function') {
                        args[last] = client.bind(callback)
                    }
                    return decideWrap.call(this, original, args, client, name)
                }
            })
        return Connection
    }

    mysql.createPool = function (config) {
        let Pool = _createPool(config)

        Shimmer.wrap(Pool, 'Pool', POOL_OPERATIONS, function (original, name) {
            return function (...args) {
                let last = args.length - 1
                let callback = args[last]

                if (typeof callback === 'function') {
                    args[last] = client.bind(callback)
                }
                return decideWrap.call(this, original, args, client, name)
            }
        })

        return Pool
    }
    return mysql
}
