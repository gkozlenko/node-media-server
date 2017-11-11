'use strict';

const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.LOG4JS_CONFIG = path.join(__dirname, '..', 'log4js.json');

module.exports = {
    host: '0.0.0.0',
    port: 3000,

    publicPath: path.resolve('./public'),
    mediaPath: path.resolve('./media'),
    indexPath: path.resolve('./index'),

    fragmentDuration: 5,

    shutdownInterval: 1000,

    workers: {
        web: {
            enabled: true,
            count: 1, //require('os').cpus().length,
            shutdownTimeout: 5000,
        },
        indexer: {
            enabled: true,
            count: 1,
            timeout: 5000,
        },
    },
};
