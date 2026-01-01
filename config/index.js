'use strict';

const path = require('path');

// Configuration
const config = {
    host: '0.0.0.0',
    port: 3000,

    publicPath: path.resolve('./public'),
    mediaPath: path.resolve('./media'),
    indexPath: path.resolve('./index'),
    logsPath: path.resolve('./logs'),

    fragmentDuration: 10,

    drmEnabled: false,
    drmSeed: 'DRM SEED',

    logLevel: 'debug',
    logSize: 50 * 1024 * 1024, // 50 Mb
    logKeep: 10,

    shutdownInterval: 1000,

    workers: {
        web: {
            enabled: true,
            count: require('os').cpus().length,
            shutdownTimeout: 5000,
        },
        indexer: {
            enabled: true,
            count: 1,
            timeout: 5000,
        },
    },
};

module.exports = config;
