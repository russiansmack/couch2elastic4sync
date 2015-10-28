#!/usr/bin/env node
var path = require('path')
var md5 = require('md5')
var mkdirp = require('mkdirp')
var bunyan = require('bunyan')
var lastLine = require('last-line')

var config = require('rc')('couch2elastic4sync', {
  addRaw: false,
  bunyan_base_path: '/tmp/couch2elastic4sync'
})
if (!config.elasticsearch) {
  console.log('No elasticsearch search.')
  process.exit(1)
}

if (config.mapper && typeof config.mapper === 'string') {
  config.mapper = require(path.resolve(config.mapper))
}

var log = getLogFile(config)

if (config._[0] === 'load') {
  var load = require('../lib/load')(config.database, config.elasticsearch, config.mapper, config.addRaw, log)
  load.pipe(process.stdout)
} else {

  getLastChange(config, function (err, since) {
    if (err) {
      console.log('an error occured', err)
      console.log('using since = now')
      since = null
    }
    else console.log('using since = ', since)
    console.log('now logging to: ', getLogPath(config))
    require('../lib')(config.database, config.elasticsearch, config.mapper, config.addRaw, log, since)
  })
}

function getLogPath (config) {
  var filename = md5(config.elasticsearch) + '.log'
  return path.resolve(config.bunyan_base_path, filename)
}

function getLogFile (config) {
  mkdirp.sync(config.bunyan_base_path)
  var filename = md5(config.elasticsearch) + '.log'
  var where = path.resolve(config.bunyan_base_path, filename)

  var log = bunyan.createLogger({
    name: 'couch2elastic4sync',
    streams: [{
        path: where
    }]
  })
  return log
}

function getLastChange (config, cb) {
  var logpath = getLogPath(config)
  lastLine(logpath, function (err, res) {
    if (err) return cb(err)

    try {
      var last_log = JSON.parse(res)
      cb(null, last_log.change)

    } catch(e) { cb(e) }

  })
}