'use strict'

let Module = require('module')
let path = require('path')
let fs = require('fs')
let debug = require('debug')('trail:instrumentations')

let shimmer = require('../shimmer')

let INSTRUMENTED_LIBS = [
    // from npm
    // 'mongoose',
    // 'mongodb',
    // 'bluebird',
    'redis',
    // 'ioredis',
    'mysql',
    // 'when',
    // 'q',
    // 'koa',
    // 'express',
    // knex and bookshelf does some black magic, so we have to do this :(
    // 'bluebird.main',
    // 'pg'
]

let CORE_LIBS = [
    'http',
]

function instrument(shortName, fileName, nodule, client) {
    let newNodule

    if (!fs.existsSync(fileName)) {
        return debug('not found %s', fileName)
    }

    let pkg
    try {
        pkg = require(path.join(shortName, 'package.json'))
    } catch (err) {
        debug('cannot load package.json for %s: %s', shortName, err.message)
    }
    newNodule = require(fileName)(nodule, client, pkg)

    return newNodule
}

function postLoadHook(nodule, name, client) {
    let instrumentation
    let base = path.basename(name)

    // knex and bookshelf does some black magic, so we have to do this :(
    if (name === 'bluebird/js/main/promise') {
        instrumentation = 'bluebird.main'
    } else {
        instrumentation = base
    }

    if (INSTRUMENTED_LIBS.indexOf(instrumentation) !== -1) {
        debug('Instrumenting %s.', base)
        let fileName = path.join(__dirname, instrumentation + '.js')
        try {
            nodule = instrument(base, fileName, nodule, client) // eslint-disable-line
            nodule._instrumentedByTrace = true
        } catch (ex) {
            debug('failed to instrument %s using %s', name, fileName)
        }
    }

    return nodule
}

// patching most commonly used node modules
module.exports.create = function (options) {
    CORE_LIBS.forEach(function (core) {
        let fileName = core + '.js'
        let filePath = path.join(__dirname, 'core', fileName)
        instrument(fileName, filePath, require(core), options.client)
    })

    shimmer.wrap(Module, 'Module', '_load', function (load) {
        return function (file) {
            return postLoadHook(
                load.apply(this, arguments), file, options.client)
        }
    })
}
