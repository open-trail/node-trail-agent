'use strict'

import TrailClient from './client'
import Instrumentation from './instrumentations'

let client = new TrailClient()
Instrumentation.create({ client })

module.exports = client
