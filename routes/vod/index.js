'use strict';

const config = require('../../config');
const errors = require('../../components/errors');

const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const express = require('express');
const VideoLib = require('node-video-lib');

let router = express.Router();

router.use(/^(.*)\/(playlist\.m3u8|chunklist\.m3u8|media-\d+\.ts)$/, (req, res, next) => {
    return Promise.resolve().then(() => {
        let fileName = path.join(config.mediaPath, req.params[0]);
        let file = null;
        return fs.openAsync(fileName, 'r').then(fd => {
            file = fd;
            let movie = VideoLib.MP4Parser.parse(file);
            if (!movie.videoTrack()) {
                throw new errors.ForbiddenError('Video file does not contain at least one video track');
            }
            req.movie = movie;
            next();
        }).finally(() => {
            if (file !== null) {
                return fs.closeAsync(file);
            }
        });
    }).catch(next);
});

router.get(/^(.*)\/playlist\.m3u8$/, (req, res) => {
    let playlist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        `#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=${req.movie.bandwidth() << 0},RESOLUTION=${req.movie.resolution()}`,
        path.join(req.baseUrl, req.params[0], 'chunklist.m3u8').replace(/\\/g, '/')
    ];
    res.header('Content-Type', 'application/x-mpegURL');
    res.send(playlist.join("\n"));
});

router.get(/^(.*)\/chunklist\.m3u8$/, (req, res) => {
    let fragments = req.movie.fragments(config.fragmentDuration);
    let playlist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        `#EXT-X-TARGETDURATION:${config.fragmentDuration}`,
        '#EXT-X-MEDIA-SEQUENCE:1'
    ];
    for (let i = 0, l = fragments.length; i < l; i++) {
        playlist.push(`#EXTINF:${_.round(fragments[i].relativeDuration(), 2)},`);
        playlist.push(path.join(req.baseUrl, req.params[0], `media-${i + 1}.ts`).replace(/\\/g, '/'));
    }
    playlist.push('#EXT-X-ENDLIST');
    res.header('Content-Type', 'application/x-mpegURL');
    res.send(playlist.join("\n"));
});

router.get(/^(.*)\/media-(\d+)\.ts$/, (req, res) => {
    let index = parseInt(req.params[1], 10);
    let fragments = req.movie.fragments(config.fragmentDuration);
    if (fragments.length < index) {
        throw new errors.NotFoundError('Chunk not found');
    }
    let fragment = fragments[index - 1];
    let buffer = VideoLib.HLSPacketizer.packetize(fragment);
    res.header('Content-Type', 'video/MP2T');
    res.send(buffer);
});

module.exports = router;
