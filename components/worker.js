'use strict';

const intel = require('intel');
const EventEmitter = require('events');

class Worker extends EventEmitter {

    constructor(name, conf) {
        super();
        this.name = name;
        this.conf = conf;
        this.logger = intel.getLogger(`worker-${name}`);
    }

    start() {

    }

    stop() {

    }

}

module.exports = Worker;
