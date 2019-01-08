'use strict';

const path = require('path');
const intel = require('intel');
const logrotate = require('logrotate-stream');

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

    logLevel: intel.DEBUG,
    logSize: '50m',
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

// Setup logger
intel.setLevel(config.logLevel);
const fileFormatter = new intel.Formatter({
    format: '[%(date)s] [%(levelname)s] %(name)s - %(message)s',
});
const consoleFormatter = new intel.Formatter({
    format: '[%(date)s] [%(levelname)s] %(name)s - %(message)s',
    colorize: true,
});
intel.addHandler(new intel.handlers.Console({
    formatter: consoleFormatter,
}));
intel.addHandler(new intel.handlers.Stream({
    stream: logrotate({
        file: path.join(config.logsPath, 'debug.log'),
        size: config.logSize,
        keep: config.logKeep,
    }),
    formatter: fileFormatter,
}));
intel.addHandler(new intel.handlers.Stream({
    level: intel.INFO,
    stream: logrotate({
        file: path.join(config.logsPath, 'info.log'),
        size: config.logSize,
        keep: config.logKeep,
    }),
    formatter: fileFormatter,
}));
intel.addHandler(new intel.handlers.Stream({
    level: intel.WARN,
    stream: logrotate({
        file: path.join(config.logsPath, 'error.log'),
        size: config.logSize,
        keep: config.logKeep,
    }),
    formatter: fileFormatter,
}));

module.exports = config;
