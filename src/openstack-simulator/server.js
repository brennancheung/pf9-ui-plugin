import bodyParser from 'body-parser'
import express from 'express'
import http from 'http'

import {
  requestLogger,
  enableAllCors,
} from './middleware'

import keystone from './api/keystone'

const defaultConfig = {
  port: 4444,
  verbose: process.env.VERBOSE === 'true' || false,
}

let serverInstance

export function startServer (config = defaultConfig) {
  console.log('Starting simulator server.')
  const app = express()

  // Since simulator is on a different port CORS applies.
  // Allow everything for the simulator.
  app.use(enableAllCors)

  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())

  if (config.verbose) {
    app.use(requestLogger)
  }
  app.use('/keystone', keystone)

  console.log(`Simulator server currently listening on port ${config.port}`)
  serverInstance = http.createServer(app).listen(config.port)
}

export function stopServer () {
  if (serverInstance) {
    console.log('Stopping simulator server.')
    return serverInstance.close()
  }
  console.log('Simulator server is not currently running.')
}
