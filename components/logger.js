'use strict';

const config = require('../config');
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.printf(({ level, message, timestamp, label, stack }) => {
    const logMessage = stack ? `${message}\n${stack}` : message;
    return `[${timestamp}] [${level.toUpperCase()}] ${label || 'app'} - ${logMessage}`;
});

const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    logFormat,
);

function createFileTransport(filename, level) {
    return new winston.transports.File({
        filename: path.join(config.logger.logPath, filename),
        level: level,
        maxsize: config.logger.maxSize,
        maxFiles: config.logger.maxFiles,
        tailable: true,
        format: baseFormat,
    });
}

const rootLogger = winston.createLogger({
    level: config.logger.level,
    transports: [
        new winston.transports.Console({
            format: baseFormat,
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
