'use strict';

const pkg = require('../package.json');
const errors = require('../components/errors');
const logger = require('intel').getLogger('server');

const _ = require('lodash');
const express = require('express');
const router = express.Router();

const SERVER_NAME = `${_.upperFirst(_.camelCase(pkg.name))}/${pkg.version}`;

router.use((req, res, next) => {
    res.header('Server', SERVER_NAME);
    next();
});

router.get('/', (req, res) => {
    res.header('Content-Type', 'text/plain');
    res.send(`${_.startCase(pkg.name)} ${pkg.version}`);
});

router.use('/vod/', require('./vod'));

router.use((error, req, res, next) => {
    logger.error(error);
    res.header('Content-Type', 'text/plain');
    if (error instanceof errors.HttpError) {
        res.status(error.code);
    } else if (error.code === 'ENOENT') {
        res.status(404);
    } else {
        res.status(500);
    }
    res.send(`${error.name}: ${error.message}\n`);
});

module.exports = router;
