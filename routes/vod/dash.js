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
        .att('profiles', 'urn:mpeg:dash:profile:full:2011')
        .att('minBufferTime', 'PT1.5S');

    let period = xml.ele('Period').att('duration', moment.duration(duration, 's').toISOString());

    if (req.fragmentList.video !== null) {
        let segment = period.ele('AdaptationSet')
            .att('mimeType', 'video/mp4')
            .ele('Representation')
            .att('id', 'video')
            .att('bandwidth', duration > 0 ? Math.round(8 * req.fragmentList.video.size / duration) : 0)
            .att('width', req.fragmentList.video.width)
            .att('height', req.fragmentList.video.height)
            .ele('SegmentTemplate')
            .att('timescale', req.fragmentList.video.timescale)
            .att('media', 'video-$Number$.ts')
            .att('initialization', 'video.sidx');
        let timestamp = 0;
        for (let i = 0, l = req.fragmentList.count(); i < l; i++) {
            let duration = req.fragmentList.get(i).duration;
            segment.ele('S').att('t', timestamp).att('d', duration);
            timestamp += duration;
        }
    }

    if (req.fragmentList.audio !== null) {
        let segment = period.ele('AdaptationSet')
            .att('mimeType', 'audio/mp4')
            .ele('Representation')
            .att('id', 'audio')
            .att('bandwidth', duration > 0 ? Math.round(8 * req.fragmentList.audio.size / duration) : 0)
            .ele('SegmentTemplate')
            .att('timescale', req.fragmentList.audio.timescale)
            .att('media', 'audio-$Number$.ts')
            .att('initialization', 'audio.sidx');
        let timestamp = 0;
        for (let i = 0, l = req.fragmentList.count(); i < l; i++) {
            let duration = req.fragmentList.get(i).duration;
            segment.ele('S').att('t', timestamp).att('d', duration);
            timestamp += duration;
        }
    }

    res.header('Content-Type', 'text/xml');
    res.send(xml.end({pretty: true}));
});

module.exports = router;
