'use strict';

const express = require('express');
const router = express.Router();

router.use(require('./hls'));
router.use(require('./dash'));

module.exports = router;
