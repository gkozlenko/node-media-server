'use strict';

const pkg = require('../package.json');
const errors = require('../components/errors');
const logger = require('../components/logger').getLogger('server');

const _ = require('lodash');
const express = require('express');
const router = express.Router();

const SERVER_NAME = `${_.upperFirst(_.camelCase(pkg.name))}/${pkg.version}`;

router.use((_req, res, next) => {
    res.set('Server', SERVER_NAME);
    next();
});

router.get('/', (_req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(`${_.startCase(pkg.name)} ${pkg.version}`);
});

router.use('/vod/', require('./vod'));

router.use((error, _req, res, _next) => {
    logger.error('Unable to handle request', error);
    res.set('Content-Type', 'text/plain');
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
