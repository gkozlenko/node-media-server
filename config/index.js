'use strict';

const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.LOG4JS_CONFIG = path.join(__dirname, '..', 'log4js.json');

module.exports = {
    workers: require('os').cpus().length,
    host: '0.0.0.0',
    port: 3000,
    shutdownWorkerTimeout: 5000,
    shutdownClusterInterval: 1000,
    publicPath: path.resolve('./public'),
    mediaPath: path.resolve('./media'),
    indexPath: path.resolve('./index'),
    fragmentDuration: 5,
};
