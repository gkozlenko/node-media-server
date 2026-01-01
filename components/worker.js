'use strict';

const logger = require('./logger');
const EventEmitter = require('events');

class Worker extends EventEmitter {

    constructor(name, conf) {
        super();
        this.name = name;
        this.conf = conf;
        this.logger = logger.getLogger(`worker-${name}`);
    }

    start() {

    }

    stop() {

    }

}

module.exports = Worker;
