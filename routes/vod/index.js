'use strict';

const config = require('../../config');
const logger = require('log4js').getLogger('vod');

const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const express = require('express');
const VideoLib = require('node-video-lib');

let router = express.Router();

router.get(/^(.*)\/playlist\.m3u8$/, (req, res, next) => {
    let fileName = path.join(config.mediaPath, req.params[0]);
    let file = null;
    return fs.openAsync(fileName, 'r').then((fd) => {
        file = fd;
        let stat = fs.fstatSync(file);
        let movie = VideoLib.MP4Parser.parse(file);
        let videoTrack = movie.videoTrack();
        if (!videoTrack) {
            throw new Error('Video file does not contain at least one video track.');
        }
        let duration = movie.relativeDuration();
        let bandwidth = duration > 0 ? Math.floor(8 * stat.size / duration) : 0;
        let playlist = [
            '#EXTM3U',
            '#EXT-X-VERSION:3',
            `#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=${bandwidth},RESOLUTION=${videoTrack.width}x${videoTrack.height}`,
            path.join(req.baseUrl, req.params[0], 'chunklist.m3u8').replace(/\\/g, '/')
        ];
        res.header('Content-Type', 'application/x-mpegURL');
        res.send(playlist.join("\n"));
    }).catch(next).finally(() => {
        if (file !== null) {
            return fs.closeAsync(file);
        }
    });
});

router.get(/^(.*)\/chunklist\.m3u8$/, (req, res, next) => {
    let fileName = path.join(config.mediaPath, req.params[0]);
    let file = null;
    return fs.openAsync(fileName, 'r').then((fd) => {
        file = fd;
        let movie = VideoLib.MP4Parser.parse(file);
        let videoTrack = movie.videoTrack();
        if (!videoTrack) {
            throw new Error('Video file does not contain at least one video track.');
        }
        let fragments = movie.fragments(config.fragmentDuration);
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
    }).catch(next).finally(() => {
        if (file !== null) {
            return fs.closeAsync(file);
        }
    });
});

router.get(/^(.*)\/media-(\d+)\.ts$/, (req, res, next) => {
    let fileName = path.join(config.mediaPath, req.params[0]);
    let index = parseInt(req.params[1], 10);
    let file = null;
    return fs.openAsync(fileName, 'r').then((fd) => {
        file = fd;
        let movie = VideoLib.MP4Parser.parse(file);
        let videoTrack = movie.videoTrack();
        if (!videoTrack) {
            throw new Error('Video file does not contain at least one video track.');
        }
        let fragments = movie.fragments(config.fragmentDuration);
        if (fragments.length < index) {
            throw new Error('Invalid chunk number.');
        }
        let fragment = fragments[index - 1];
        let buffer = VideoLib.HLSPacketizer.packetize(fragment);
        res.header('Content-Type', 'video/MP2T');
        res.send(buffer);
    }).catch(next).finally(() => {
        if (file !== null) {
            return fs.closeAsync(file);
        }
    });
});

module.exports = router;
