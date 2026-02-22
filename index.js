'use strict';

const config = require('./config');
const logger = require('./components/logger').getLogger('server');
const path = require('path');

const { Worker, MessageChannel } = require('worker_threads');

let web = null;
const workers = new Map();

function startWorker(id) {
    const name = `worker-${id}`;

    const worker = new Worker(path.join(__dirname, 'workers', 'media.js'), {
        workerData: { name: name },
    });

    const { port1, port2 } = new MessageChannel();
    worker.postMessage({ action: 'updateWebChannel', port: port2 }, [port2]);
    web.postMessage({ action: 'updateWorkerChannel', id: id, port: port1 }, [port1]);

    worker.on('exit', (code) => {
        if (code !== 0) {
            logger.warn(`Worker #${id} crashed with code ${code}. Restarting in 1s...`);
            workers.delete(id);
            setTimeout(() => {
                startWorker(id);
            }, 1000);
        } else {
            logger.info(`Worker #${id} stopped gracefully.`);
        }
    });

    worker.on('error', (err) => {
        logger.error(`Worker #${id} error:`, err);
    });

    workers.set(id, worker);
    logger.info(`Worker #${id} started.`);
}

function start() {
    logger.info('Starting media server...');

    web = new Worker(path.join(__dirname, 'workers', 'web.js'));

    web.on('exit', (code) => {
        if (code !== 0) {
            logger.error('Web worker crashed. Shutting down media server.');
            process.exit(1);
        }
    });

    for (let i = 0; i < config.workers.count; i++) {
        startWorker(i);
    }
}

function shutdown() {
    logger.info('Stopping media server...');

    const exitPromises = [];

    if (web) {
        exitPromises.push(new Promise((resolve) => {
            web.once('exit', resolve);
            web.postMessage({ action: 'shutdown' });
        }));
    }

    for (const worker of workers.values()) {
        exitPromises.push(new Promise((resolve) => {
            worker.once('exit', resolve);
            worker.postMessage({ action: 'shutdown' });
        }));
    };

    const forceTimeout = setTimeout(() => {
        logger.error('Shutdown timed out. Forcing exit.');
        process.exit(1);
    }, config.server.shutdownTimeout || 10000);

    Promise.all(exitPromises).then(() => {
        clearTimeout(forceTimeout);
        logger.info('Server successfully stopped.');
        process.exit(0);
    });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
