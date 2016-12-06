'use strict';

module.exports = {
    workers: require('os').cpus().length,
    host: '0.0.0.0',
    port: 3000,
    shutdownWorkerTimeout: 5000,
    shutdownClusterInterval: 1000,
    publicPath: './public',
    mediaPath: './media'
};
