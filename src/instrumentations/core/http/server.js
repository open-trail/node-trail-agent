'use strict'

let debug = require('debug')('trail')
let consts = require('../../../consts')

function wrapListener(listener, client) {
    return function (request, response) {
        let requestUrl = request.url.split('?')[0]
        let headers = request.headers

        let span = client.start(requestUrl, client.FORMAT_TEXT_MAP, headers)
        span.setTag('protocol', consts.PROTOCOLS.HTTP)
        debug('trace event (sr); request: %s', span.traceId, headers)

        response.once('finish', function instrumentedFinish() {
            debug('trace event (ss); request: %s, request finished',
                  span.traceId)
            span.setTag('statusCode', response.statusCode)
            span.finish()
        })

        return listener.apply(this, arguments)
    }
}

module.exports = wrapListener
