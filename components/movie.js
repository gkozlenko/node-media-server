'use strict';

const config = require('../config');
const logger = require('./logger').getLogger('movie');

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const openFile = require('util').promisify(fs.open);
const closeFile = require('util').promisify(fs.close);
const unlinkFile = require('util').promisify(fs.unlink);

const VideoLib = require('node-video-lib');
const Indexer = require('./indexer');

function openMovie(req, _res, next) {
    let startTime = Date.now();
    return Promise.resolve().then(() => {
        req.file = null;
        req.index = null;
        req.fragmentList = null;

        let name = req.params[0];
        let fileName = path.join(config.mediaPath, name);
        let indexName = Indexer.getIndexName(name);

        return Promise.all([
            openFile(fileName, 'r').then((fd) => {
                req.file = fd;
            }),
            openFile(indexName, 'r').then((fd) => {
                req.index = fd;
                req.fragmentList = VideoLib.FragmentListIndexer.read(req.index);
            }).catch((err) => {
                let promise = Promise.resolve();
                if (err.code !== 'ENOENT') {
                    promise = unlinkFile(indexName).catch(() => {
                        logger.warn('Cannot remove invalid index file: %s', indexName);
                    });
                }
                return promise.then(() => {
                    process.send({action: 'index', data: {name: name}});
                });
            }),
        ]).then(() => {
            if (req.fragmentList === null) {
                let movie = VideoLib.MovieParser.parse(req.file);
                req.fragmentList = VideoLib.FragmentListBuilder.build(movie, config.fragmentDuration);
            }
            next();
        }).finally(() => {
            return Promise.all([req.file, req.index].map((file) => {
                if (file !== null) {
                    return closeFile(file);
                }
            }));
        }).then(() => {
            logger.debug('Elapsed time: %s, URL: %s', (Date.now() - startTime) + 'ms', path.join(req.baseUrl, req.url).replace(/\\/g, '/'));
        });
    }).catch(next);
}

function movieKey(name) {
    return crypto.createHash('md5').update(`${name}.${config.drmSeed}.key`).digest();
}

function movieIv(name) {
    return crypto.createHash('md5').update(`${name}.${config.drmSeed}.iv`).digest();
}

function encryptChunk(name, buffer) {
    let cipher = crypto.createCipheriv('aes-128-cbc', movieKey(name), movieIv(name));
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
}

module.exports = {
    openMovie,
    movieKey,
    movieIv,
    encryptChunk,
};
