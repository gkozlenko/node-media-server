'use strict';

const config = require('../config');

const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

const VideoLib = require('node-video-lib');
const Indexer = require('./indexer');

function openMovie(req, res, next) {
    let startTime = Date.now();
    return Promise.resolve().then(() => {
        req.file = null;
        req.index = null;
        req.fragmentList = null;

        let name = req.params[0];
        let fileName = path.join(config.mediaPath, name);
        let indexName = Indexer.getIndexName(name);

        return Promise.all([
            fs.openAsync(fileName, 'r').then((fd) => {
                req.file = fd;
            }),
            fs.openAsync(indexName, 'r').then((fd) => {
                req.index = fd;
                req.fragmentList = VideoLib.FragmentListIndexer.read(req.index);
            }).catch((err) => {
                let promise = Promise.resolve();
                if (err.code !== 'ENOENT') {
                    promise = fs.unlinkAsync(indexName).catch(() => {
                        req.logger.warn('Cannot remove invalid index file:', indexName);
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
                    return fs.closeAsync(file);
                }
            }));
        }).then(() => {
            req.logger.debug('Elapsed time:', (Date.now() - startTime) + 'ms', 'URL:', path.join(req.baseUrl, req.url).replace(/\\/g, '/'));
        });
    }).catch(next);
}

module.exports = {
    openMovie
};
