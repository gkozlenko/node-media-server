'use strict';

const path = require('path');

const config = {
    server: {
        // Timeout for graceful shutdown (in milliseconds)
        shutdownTimeout: 10000,
    },

    workers: {
        // Number of media worker threads
        count: require('os').cpus().length,
        // Timeout for worker graceful shutdown
        shutdownTimeout: 5000,
    },

    web: {
        // Host and port for the web server
        host: '0.0.0.0',
        port: 3000,
        // Path to static files
        staticPath: path.resolve('./public'),
        // Timeout for worker requests (in milliseconds)
        workerTimeout: 1000,
        // Timeout for web server graceful shutdown
        shutdownTimeout: 5000,
    },

    logger: {
        // Path to log files
        logPath: path.resolve('./logs'),
        // Log level (available levels: 'debug', 'info', 'warn' and 'error')
        level: 'debug',
        // Maximum log size in bytes
        maxSize: 50 * 1024 * 1024,
        // How many rotated log files to keep
        maxFiles: 10,
    },

    media: {
        // Video chunk duration (in seconds)
        fragmentDuration: 5,
        // Path to video files
        mediaPath: path.resolve('./media'),

        // Indexing configuration
        indexEnabled: true,
        // Path to index files
        indexPath: path.resolve('./index'),

        // Encryption configuration
        encryptionEnabled: false,
        encryptionSeed: 'CIPHER SEED',
    },
};

module.exports = config;
