'use strict';

const config = require('../config');
const Worker = require('../components/worker');
const Indexer = require('../components/indexer');
const Promise = require('bluebird');

class IndexerWorker extends Worker {

    constructor(name, conf) {
        super(name, conf);
        this.stopped = false;
        this.queue = [];

        // Getting messages
        process.on('message', (message) => {
            this.logger.debug('Message from master:', message);
            if (message.action === 'index') {
                if (message.data) {
                    this.queue.push(message.data);
                }
            }
        });

    }

    start() {
        this._startHandling();
    }

    stop() {
        this.stopped = true;
    }

    _startHandling() {
        if (!this.stopped) {
            return Promise.resolve().then(() => {
                let data = this.queue.pop();
                if (data) {
                    this.logger.info(`Index file: ${data.name}`);
                    return Indexer.index(data.name);
                }
            }).catch((err) => {
                this.logger.error(`Cannot index file: ${err.message}`, err);
            }).finally(() => {
                return Promise.delay(this.conf.timeout).then(() => {
                    return this._startHandling();
                });
            });
        } else {
            this.emit('stop');
        }
    }

}

module.exports = IndexerWorker;
