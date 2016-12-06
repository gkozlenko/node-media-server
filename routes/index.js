'use strict';

const pkg = require('../package.json');

const _ = require('lodash');
const express = require('express');

let router = express.Router();

router.get('/', (req, res) => {
    res.header('Content-Type', 'text/plain');
    res.send(`${_.startCase(pkg.name)} ${pkg.version}`);
});

module.exports = router;