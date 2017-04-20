'use strict';

const config = require('../config');
const Worker = require('../components/worker');
const Indexer = require('../components/indexer');

const Promise = require('bluebird');

class IndexerWorker extends Worker {

    constructor(name, conf) {
        super(name, conf);
        this.stopped = false;
        this.promise = Promise.resolve();

        // Start pooling
        process.on('message', (message) => {
            console.log('Message from master:', message);
            if (message.action === 'receiveQueue' && message.queue === 'index') {
                if (message.data) {
                    this.promise = this.promise.then(() => {
                        return message.data;
                    });
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
            process.send({action: 'receiveQueue', queue: 'index'});
            return this.promise.then((data) => {
                if (data) {
                    this.logger.info('Index file %s.', data.name);
                    return Indexer.index(data.name);
                } else {
                    return Promise.delay(this.conf.timeout);
                }
            }).catch((err) => {
                console.log(err);
            }).finally(() => {
                return this._startHandling();
            });
        } else {
            this.emit('stop');
        }
    }

}

module.exports = IndexerWorker;
