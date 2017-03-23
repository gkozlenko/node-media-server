'use strict';

const log4js = require('log4js');
const EventEmitter = require('events');

class Worker extends EventEmitter {

    constructor(name, conf) {
        super();
        this.name = name;
        this.conf = conf;
        this.logger = log4js.getLogger(`worker-${name}`);
    }

    start() {

    }

    stop() {

    }

}

module.exports = Worker;
