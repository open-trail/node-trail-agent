'use strict'

let Shimmer = require('../../shimmer')
let wrapListener = require('./http/server.js')
let wrapRequest = require('./http/request.js')

module.exports = function wrapHTTP(http, client) {
    client.bindEmitter(http.Server.prototype)

    Shimmer.wrap(http.Server.prototype,
                 'http.Server.prototype',
                 ['on', 'addListener'],
                 function (addListener) {
                     return function (type, listener) {
                         if (type === 'request' &&
                                typeof listener === 'function') {
                             return addListener.call(
                                 this, type, wrapListener(listener, client))
                         }
                         return addListener.apply(this, arguments)
                     }
                 })

    Shimmer.wrap(http, 'http', 'request', function (original) {
        return wrapRequest(original, client)
    })

    return http
}
