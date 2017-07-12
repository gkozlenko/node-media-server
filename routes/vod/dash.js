'use strict';

const config = require('../../config');
const errors = require('../../components/errors');

const _ = require('lodash');
const path = require('path');
const moment = require('moment');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const xmlBuilder = require('xmlbuilder');
const express = require('express');
const router = express.Router();

const Movie = require('../../components/movie');

router.get(/^(.*)\/manifest\.mpd$/, Movie.openMovie, (req, res) => {
    let duration = req.fragmentList.relativeDuration();

    let xml = xmlBuilder.create('MPD', {encoding: 'UTF-8'})
        .att('xmlns', 'urn:mpeg:dash:schema:mpd:2011')
        .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        .att('xmlns:xlink', 'http://www.w3.org/1999/xlink')
        .att('xsi:schemaLocation', 'urn:mpeg:DASH:schema:MPD:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd')
        .att('profiles', 'urn:mpeg:dash:profile:isoff-live:2011')
        .att('type', 'static')
        .att('publishTime', moment().utc().format())
        .att('mediaPresentationDuration', moment.duration(duration, 's').toISOString())
        .att('minBufferTime', 'PT1.5S');

    res.header('Content-Type', 'text/xml');
    res.send(xml.end({pretty: true}));
});

module.exports = router;
