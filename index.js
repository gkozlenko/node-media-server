'use strict';

const config = require('./config');
const logger = require('log4js').getLogger('app');

const _ = require('lodash');
const cluster = require('cluster');

let shutdownInterval = null;

function startWorker() {
    const worker = cluster.fork().on('online', () => {
        logger.info('Start worker #%d.', worker.id);
    }).on('exit', status => {
        if ((worker.exitedAfterDisconnect || worker.suicide) === true || status === 0) {
            logger.info('Worker #%d was killed.', worker.id);
        } else {
            logger.warn('Worker #%d was died. Replace it with a new one.', worker.id);
            startWorker();
        }
    });
}

function shutdownCluster() {
    if (cluster.isMaster) {
        clearInterval(shutdownInterval);
        if (_.size(cluster.workers) > 0) {
            logger.info('Shutdown workers:', _.size(cluster.workers));
            _.each(cluster.workers, worker => {
                try {
                    worker.send('shutdown');
                } catch (err) {
                    logger.warn('Cannot send shutdown message to worker:', err);
                }
            });
            shutdownInterval = setInterval(() => {
                if (_.size(cluster.workers) === 0) {
                    process.exit();
                }
            }, config.shutdownClusterInterval);
        } else {
            process.exit();
        }
    }
}

if (cluster.isMaster) {
    for (let i = 0; i < config.workers; i++) {
        startWorker();
    }
} else {
    const express = require('express');
    let app = express();
    app.use(express.static(config.publicPath));
    app.use('/', require('./routes'));
    let server = app.listen(config.port, config.host, function() {
        logger.info('Start Server at %s:%d', this.address().address, this.address().port);
    });
    process.on('message', message => {
        if (message === 'shutdown') {
            let stopTimeout = setTimeout(() => {
                process.exit();
            }, config.shutdownWorkerTimeout);
            server.close(() => {
                clearTimeout(stopTimeout);
                process.exit();
            });
        }
    });
}

// Shutdown
process.on('SIGTERM', shutdownCluster);
process.on('SIGINT', shutdownCluster);
