'use strict';

const config = require('../config');
const Worker = require('../components/worker');

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const winston = require('winston');

class WebWorker extends Worker {

    constructor(name, conf) {
        super(name, conf);
        this.app = express();

        // access logger
        const accessLogger = winston.createLogger({
            transports: [
                new winston.transports.File({
                    filename: path.join(config.logsPath, 'access.log'),
                    maxsize: config.logSize,
                    maxFiles: config.logKeep,
                    tailable: true,
                    level: 'info',
                    format: winston.format.printf(({ message }) => message.trim()),
                }),
            ],
        });
        const morganStream = {
            write: (message) => {
                accessLogger.info(message);
            },
        };
        this.app.use(morgan('combined', { stream: morganStream }));

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
