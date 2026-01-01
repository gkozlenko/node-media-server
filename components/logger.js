'use strict';

const config = require('../config');
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.printf(({ level, message, timestamp, label, stack }) => {
    return `[${timestamp}] [${level.toUpperCase()}] ${label || 'app'} - ${stack || message}`;
});

function createFileTransport(filename, level) {
    return new winston.transports.File({
        filename: path.join(config.logsPath, filename),
        level: level,
        maxsize: config.logSize,
        maxFiles: config.logKeep,
        tailable: true,
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.splat(),
            logFormat,
        ),
    });
}

const rootLogger = winston.createLogger({
    level: config.logLevel,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.splat(),
                logFormat,
            ),
        }),
        createFileTransport('debug.log', 'debug'),
        createFileTransport('info.log', 'info'),
        createFileTransport('error.log', 'warn'),
    ],
});

function getLogger(name) {
    return rootLogger.child({ label: name });
}

module.exports = {
    getLogger,
};
