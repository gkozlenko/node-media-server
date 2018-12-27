'use strict';

const cluster = require('cluster');
const config = require('./config');
const _ = require('lodash');
const path = require('path');
const logger = require('intel').getLogger('app');

let shutdownInterval = null;
let workers = {};

function startWorker(name) {
    const worker = cluster.fork({WORKER_NAME: name}).on('online', () => {
        logger.info('Start %s worker #%d.', name, worker.id);
        workers[name] = workers[name] || [];
        workers[name].push(worker.id);
    }).on('message', (message) => {
        logger.debug('Message from worker #' + worker.id + ':', message);
        if (message.action) {
            switch (message.action) {
                case 'index': {
                    let indexer = cluster.workers[_.sample(workers.indexer || [])];
                    if (indexer) {
                        indexer.send(message);
                    } else {
                        logger.debug('Indexer worker not found.');
                    }
                    break;
                }
            }
        }
    }).on('exit', (status) => {
        workers[name] = _.without(workers[name], worker.id);
        if (worker.exitedAfterDisconnect === true || status === 0) {
            logger.info('Worker %s #%d was killed.', name, worker.id);
        } else {
            logger.warn('Worker %s #%d was died. Replace it with a new one.', name, worker.id);
            startWorker(name);
        }
    });
}

function shutdownCluster() {
    if (cluster.isMaster) {
        clearInterval(shutdownInterval);
        if (_.size(cluster.workers) > 0) {
            logger.info('Shutdown workers:', _.size(cluster.workers));
            _.each(cluster.workers, (worker) => {
                try {
                    worker.send({action: 'shutdown'});
                } catch (err) {
                    logger.warn('Cannot send shutdown message to worker:', err);
                }
            });
            shutdownInterval = setInterval(() => {
                if (_.size(cluster.workers) === 0) {
                    process.exit();
                }
            }, config.shutdownInterval);
        } else {
            process.exit();
        }
    }
}

if (cluster.isMaster) {
    _.each(config.workers, (conf, name) => {
        if (conf.enabled) {
            for (let i = 0; i < conf.count; i++) {
                startWorker(name);
            }
        }
    });
} else {
    const name = process.env.WORKER_NAME;
    const WorkerClass = require(path.join(__dirname, 'workers', `${name}.js`));
    let worker = null;
    if (WorkerClass) {
        worker = new WorkerClass(name, config.workers[name]);
        worker.start();
        worker.on('stop', () => {
            process.exit();
        });
    }
    process.on('message', (message) => {
        if (message.action === 'shutdown') {
            if (worker) {
                worker.stop();
            } else {
                process.exit();
            }
        }
    });
}

// Shutdown
process.on('SIGTERM', shutdownCluster);
process.on('SIGINT', shutdownCluster);
