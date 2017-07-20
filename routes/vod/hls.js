'use strict';

const config = require('../../config');
const errors = require('../../components/errors');

const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const express = require('express');
const router = express.Router();

const VideoLib = require('node-video-lib');
const Movie = require('../../components/movie');

router.get(/^(.*)\/playlist\.m3u8$/, Movie.openMovie, (req, res) => {
    let duration = req.fragmentList.relativeDuration();
    let bandwidth = duration > 0 ? Math.round(8 * req.fragmentList.size() / duration) : 0;
    let resolution = '';
    if (req.fragmentList.video) {
        resolution = `${req.fragmentList.video.width}x${req.fragmentList.video.height}`;
    }
    let playlist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        `#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=${bandwidth},RESOLUTION=${resolution}`,
        path.join(req.baseUrl, req.params[0], 'chunklist.m3u8').replace(/\\/g, '/')
    ];
    res.header('Content-Type', 'application/x-mpegURL');
    res.send(playlist.join("\n"));
});

router.get(/^(.*)\/chunklist\.m3u8$/, Movie.openMovie, (req, res) => {
    let playlist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        `#EXT-X-TARGETDURATION:${req.fragmentList.fragmentDuration}`,
        '#EXT-X-MEDIA-SEQUENCE:1'
    ];
    for (let i = 0, l = req.fragmentList.count(); i < l; i++) {
        playlist.push(`#EXTINF:${_.round(req.fragmentList.get(i).relativeDuration(), 2)},`);
        playlist.push(path.join(req.baseUrl, req.params[0], `media-${i + 1}.ts`).replace(/\\/g, '/'));
    }
    playlist.push('#EXT-X-ENDLIST');
    res.header('Content-Type', 'application/x-mpegURL');
    res.send(playlist.join("\n"));
});

router.get(/^(.*)\/media-(\d+)\.ts$/, Movie.openMovie, (req, res) => {
    let index = parseInt(req.params[1], 10);
    if (req.fragmentList.count() < index) {
        throw new errors.NotFoundError('Chunk not found');
    }
    let fragment = req.fragmentList.get(index - 1);
    let sampleBuffers = VideoLib.FragmentReader.readSamples(fragment, req.file);
    let buffer = VideoLib.HLSPacketizer.packetize(fragment, sampleBuffers);
    res.header('Content-Type', 'video/MP2T');
    res.send(buffer);
});

module.exports = router;
