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

function openMovie(req, res, next) {
    let startTime = Date.now();
    return Promise.resolve().then(() => {
        let fileName = path.join(config.mediaPath, req.params[0]);
        return fs.openAsync(fileName, 'r').then(fd => {
            req.file = fd;
            let movie = VideoLib.MP4Parser.parse(fd);
            req.fragments = movie.fragments(config.fragmentDuration);
            next();
        }).finally(() => {
            if (req.file !== null) {
                return fs.closeAsync(req.file);
            }
        }).then(() => {
            req.logger.debug('Elapsed time:', (Date.now() - startTime) + 'ms', 'URL:', path.join(req.baseUrl, req.url).replace(/\\/g, '/'));
        });
    }).catch(next);
}

router.get(/^(.*)\/playlist\.m3u8$/, openMovie, (req, res) => {
    let playlist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        `#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=${req.fragments.bandwidth() << 0},RESOLUTION=${req.fragments.resolution()}`,
        path.join(req.baseUrl, req.params[0], 'chunklist.m3u8').replace(/\\/g, '/')
    ];
    res.header('Content-Type', 'application/x-mpegURL');
    res.send(playlist.join("\n"));
});

router.get(/^(.*)\/chunklist\.m3u8$/, openMovie, (req, res) => {
    let playlist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        `#EXT-X-TARGETDURATION:${req.fragments.fragmentDuration}`,
        '#EXT-X-MEDIA-SEQUENCE:1'
    ];
    for (let i = 0, l = req.fragments.length; i < l; i++) {
        playlist.push(`#EXTINF:${_.round(req.fragments[i].relativeDuration(), 2)},`);
        playlist.push(path.join(req.baseUrl, req.params[0], `media-${i + 1}.ts`).replace(/\\/g, '/'));
    }
    playlist.push('#EXT-X-ENDLIST');
    res.header('Content-Type', 'application/x-mpegURL');
    res.send(playlist.join("\n"));
});

router.get(/^(.*)\/media-(\d+)\.ts$/, openMovie, (req, res) => {
    let index = parseInt(req.params[1], 10);
    if (req.fragments.length < index) {
        throw new errors.NotFoundError('Chunk not found');
    }
    let fragment = req.fragments[index - 1];
    let buffer = VideoLib.HLSPacketizer.packetize(fragment, req.file);
    res.header('Content-Type', 'video/MP2T');
    res.send(buffer);
});

module.exports = router;
