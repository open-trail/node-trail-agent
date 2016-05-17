'use strict'

import TrailClient from './client'
import tracer from 'basictracer'

module.exports = new TrailClient(tracer)
