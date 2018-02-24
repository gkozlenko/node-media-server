'use strict';

const config = require('../config');
const Worker = require('../components/worker');

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logrotate = require('logrotate-stream');

class WebWorker extends Worker {

    constructor(name, conf) {
        super(name, conf);
        this.app = express();
        this.app.use(morgan('combined', {
            stream: logrotate({
                file: path.join(config.logsPath, 'access.log'),
                size: config.logSize,
                keep: config.logKeep,
            }),
        }));
        this.app.use(express.static(config.publicPath));
        this.app.use(cors());
        this.app.use('/', require('../routes'));
    }

    start() {
        this.server = this.app.listen(config.port, config.host, () => {
            this.logger.info('Start Server at %s:%d', this.server.address().address, this.server.address().port);
        });
    }

    stop() {
        let stopTimeout = setTimeout(() => {
            this.emit('stop');
        }, this.conf.shutdownTimeout);
        this.server.close(() => {
            clearTimeout(stopTimeout);
            this.emit('stop');
        });
    }

}

module.exports = WebWorker;
