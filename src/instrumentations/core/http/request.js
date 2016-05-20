'use strict'

let debug = require('debug')('trail')
let url = require('url')
let consts = require('../../../consts')

function wrapRequest(originalHttpRequest, client) {
    return function wrappedRequest() {
        let requestParams = arguments[0]

        // parse request
        if (typeof requestParams === 'string') {
            requestParams = url.parse(requestParams)
            requestParams.method = 'GET'
            arguments[0] = requestParams
        }

        if (requestParams.hostname) {
            requestParams.host = requestParams.hostname
        }

        // decorate headers
        requestParams.headers = requestParams.headers || {}

        let span = client.fork(requestParams.path, client.FORMAT_TEXT_MAP,
                               requestParams.headers)
        span.setTag('protocol', consts.PROTOCOLS.HTTP)
        debug('trace event (cs); reqId: %s, spanId: %s',
              span.traceId, span.spanId)

        let returned = originalHttpRequest.apply(this, arguments)

        returned.on('error', function () {
            debug('trace event (cr) on error; reqId: %s, spanId: %s must collect', // eslint-disable-line
                  span.traceId, span.spanId)
            span.setTag('status', consts.EDGE_STATUS.NOT_OK)
            span.finish()
        })

        // returns with response
        returned.on('response', function (incomingMessage) {
            let status = incomingMessage.statusCode > 399 ?
                consts.EDGE_STATUS.NOT_OK : consts.EDGE_STATUS.OK
            span.setTag('statusCode', incomingMessage.statusCode)
            span.setTag('status', status)
            span.finish()
        })

        // client.bind(returned)

        return returned
    }
}

module.exports = wrapRequest
