'use strict';

const Worker = require('../components/worker');
const Indexer = require('../components/indexer');
const Promise = require('bluebird');
const fs = require('fs');

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
                    let indexName = Indexer.getIndexName(data.name);
                    if (!fs.existsSync(indexName)) {
                        this.logger.info(`Index file: ${data.name}`);
                        Indexer.index(data.name);
                    }
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
