'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const winston = require('winston');
const crypto = require('crypto');

const logger = require('../components/logger').getLogger('web');
const errors = require('../components/errors');
const config = require('../config');

const { parentPort } = require('worker_threads');
if (!parentPort) {
    logger.error('Web worker must be spawned as a Worker Thread');
    process.exit(1);
}

let isShuttingDown = false;
let server = null;
const workerPorts = new Map();
const pendingRequests = new Map();

// access logger configuration
const accessLogger = winston.createLogger({
    transports: [
        new winston.transports.File({
            filename: path.join(config.logger.logPath, 'access.log'),
            maxsize: config.logger.maxSize,
            maxFiles: config.logger.maxFiles,
            tailable: true,
            level: 'info',
            format: winston.format.printf(({ message }) => message.trim()),
        }),
    ],
});
const morganStream = {
    write: (message) => {
        accessLogger.info(message);
    },
};

// create express application
const app = express();
app.use(morgan('combined', { stream: morganStream }));
app.use(express.static(config.web.staticPath));
app.use(cors());

// middleware to call media worker
app.use((req, _res, next) => {
    req.callWorker = (payload, timeoutMs = config.web.workerTimeout || 1000) => {
        if (isShuttingDown) {
            return Promise.reject(new errors.ServiceUnavailableError('Server is shutting down'));
        }

        return new Promise((resolve, reject) => {
            const availablePorts = [...workerPorts.values()];

            if (availablePorts.length === 0) {
                return reject(new errors.ServiceUnavailableError('No workers available'));
            }

            const requestId = crypto.randomUUID();
            const port = availablePorts[Math.floor(Math.random() * availablePorts.length)];

            const timeoutTimer = setTimeout(() => {
                if (pendingRequests.has(requestId)) {
                    pendingRequests.delete(requestId);
                    reject(new errors.RequestTimeoutError('Worker request timed out'));
                }
            }, timeoutMs);

            pendingRequests.set(requestId, { resolve, reject, timeoutTimer });
            port.postMessage({ ...payload, requestId });
        });
    };
    next();
});

app.use('/', require('../routes'));

function handleUpdateWorkerChannel({ id, port }) {
    if (workerPorts.has(id)) {
        try {
            workerPorts.get(id).close();
        } catch (err) {
            logger.error(`Error closing old worker port ${id}:`, err);
        }
    }

    port.on('message', (msg) => {
        if (msg.requestId && pendingRequests.has(msg.requestId)) {
            const { resolve, reject, timeoutTimer } = pendingRequests.get(msg.requestId);

            clearTimeout(timeoutTimer);
            pendingRequests.delete(msg.requestId);

            if (msg.error) {
                reject(new errors.HttpError(msg.error.code, msg.error.message));
            } else {
                resolve(msg.data);
            }
        }
    });

    workerPorts.set(id, port);
    logger.debug(`Worker channel #${id} connected.`);
}

function shutdown() {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;

    logger.info('Stopping web worker...');

    // reject pending requests
    for (const [_requestId, reqData] of pendingRequests) {
        const { reject, timeoutTimer } = reqData;
        clearTimeout(timeoutTimer);
        reject(new errors.ServiceUnavailableError('Server is shutting down'));
    }
    pendingRequests.clear();

    // close worker ports
    for (const port of workerPorts.values()) {
        try {
            port.close();
        } catch (_err) {
            // ignore
        }
    };

    const forceTimeout = setTimeout(() => {
        logger.warn('Shutdown timed out. Forcing exit.');
        process.exit(0);
    }, config.web.shutdownTimeout || 5000);

    if (server) {
        server.close(() => {
            clearTimeout(forceTimeout);
            logger.info('Web worker successfully stopped.');
            process.exit(0);
        });
    } else {
        clearTimeout(forceTimeout);
        process.exit(0);
    }
}

// listen to messages from main thread
parentPort.on('message', (msg) => {
    if (msg.action === 'updateWorkerChannel') {
        handleUpdateWorkerChannel(msg);
    } else if (msg.action === 'shutdown') {
        shutdown();
    }
});

// start web server
try {
    server = app.listen(config.web.port, config.web.host, () => {
        const addr = server.address();
        logger.info('Web server started at %s:%d', addr.address, addr.port);
    });

    server.on('error', (err) => {
        logger.error('Server error:', err);
        process.exit(1);
    });
} catch (err) {
    logger.error('Failed to start web worker:', err);
    process.exit(1);
}
