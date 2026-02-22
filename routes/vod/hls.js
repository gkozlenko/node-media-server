'use strict';

const config = require('../../config');
const errors = require('../../components/errors');
const cipher = require('../../components/cipher');

const path = require('path');
const express = require('express');
const router = express.Router();

const FragmentListDto = require('../../models/fragment-list-dto');

router.get(/^\/(.+)\/playlist\.m3u8$/, async (req, res) => {
    const payload = await req.callWorker({
        action: 'getFragmentList',
        filename: req.params[0],
    });
    const fragmentList = new FragmentListDto(payload);

    const streamAttributes = {
        'program-id': 1,
    };

    if (fragmentList.bandwidth() > 0) {
        streamAttributes.bandwidth = fragmentList.bandwidth();
    }

    if (fragmentList.videoResolution() !== null) {
        streamAttributes.resolution = fragmentList.videoResolution();
    }

    if (fragmentList.codecStrings().length) {
        streamAttributes.codecs = fragmentList.codecStrings().join(',');
    }

    const streamAttributesPairs = Object.entries(streamAttributes)
        .map(([key, value]) => `${key.toUpperCase()}=${value}`);

    const playlist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        `#EXT-X-STREAM-INF:${streamAttributesPairs.join(',')}`,
        path.join(req.baseUrl, req.params[0], 'chunklist.m3u8').replace(/\\/g, '/'),
        '',
    ];

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(playlist.join('\n'));
});

router.get(/^\/(.+)\/chunklist\.m3u8$/, async (req, res) => {
    const payload = await req.callWorker({
        action: 'getFragmentList',
        filename: req.params[0],
    });
    const fragmentList = new FragmentListDto(payload);

    const playlist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        `#EXT-X-TARGETDURATION:${Math.ceil(fragmentList.maxFragmentDuration())}`,
        '#EXT-X-MEDIA-SEQUENCE:1',
    ];

    if (config.media.encryptionEnabled) {
        const keyUrl = path.join(req.baseUrl, req.params[0], 'encryption.key').replace(/\\/g, '/');
        playlist.push(`#EXT-X-KEY:METHOD=AES-128,URI="${keyUrl}",IV=0x${cipher.cipherIv(req.params[0]).toString('hex')}`);
    }

    for (const [index, duration] of fragmentList.fragmentDurations().entries()) {
        playlist.push(`#EXTINF:${duration.toFixed(3)},`);
        playlist.push(path.join(req.baseUrl, req.params[0], `media-${index + 1}.ts`).replace(/\\/g, '/'));
    }

    playlist.push('#EXT-X-ENDLIST', '');

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(playlist.join('\n'));
});

router.get(/^\/(.+)\/media-(\d+)\.ts$/, async (req, res) => {
    const payload = await req.callWorker({
        action: 'getChunk',
        filename: req.params[0],
        chunkIndex: parseInt(req.params[1], 10) - 1,
        useEncryption: config.media.encryptionEnabled,
    });

    res.set('Content-Type', 'video/MP2T');
    res.end(Buffer.from(payload.buffer));
});

router.get(/^\/(.+)\/encryption\.key$/, (req, res) => {
    if (!config.media.encryptionEnabled) {
        throw new errors.NotFoundError('Encryption key not found');
    }

    res.send(cipher.cipherKey(req.params[0]));
});

module.exports = router;
