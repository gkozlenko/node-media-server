'use strict';

const config = require('../config');
const Worker = require('../components/worker');
const MessageQueue = require('../components/message_queue');
const Indexer = require('../components/indexer');

const Promise = require('bluebird');

class IndexerWorker extends Worker {

    constructor(name, conf) {
        super(name, conf);
        this.stopped = false;
        this.promise = Promise.resolve();
    }

    start() {
        this._startHandling();
    }

    stop() {
        this.stopped = true;
    }

    _startHandling() {
        if (!this.stopped) {
            return MessageQueue.receive('index').then((data) => {
                if (data) {
                    return Indexer.index(data.name);
                } else {
                    return Promise.delay(this.conf.timeout);
                }
            }).finally(() => {
                return this._startHandling();
            });
        } else {
            this.emit('stop');
        }
    }

}

module.exports = IndexerWorker;
