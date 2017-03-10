'use strict';

const config = require('../config');
const _ = require('lodash');
const path = require('path');
const md5 = require('md5');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const VideoLib = require('node-video-lib');

class Indexer {

    static getIndexName(name) {
        let indexPart = md5(name);
        return path.join(config.indexPath, indexPart.slice(0, 2), indexPart.slice(2, 4), `${indexPart}.idx`);
    }

    static getTempName(name) {
        path.join(config.indexPath, `${md5(name)}.${_.random(100000, 999999)}.tmp`);
    }

    static index(name) {
        let fileName = path.join(config.mediaPath, name);
        let indexName = Indexer.getIndexName(name);
        let tmpName = Indexer.getTempName(name);
        let file = null;
        let index = null;

        return Promise.all([
            fs.openAsync(fileName, 'r').then((fd) => {
                file = fd;
            }),
            fs.openAsync(tmpName, 'w').then((fd) => {
                index = fd;
            }),
        ]).then(() => {
            let movie = VideoLib.MP4Parser.parse(file);
            let fragmentList = VideoLib.FragmentListBuilder.build(movie, config.fragmentDuration);
            VideoLib.FragmentListIndexer.index(fragmentList, index);
        }).finally(() => {
            return Promise.all([file, index].map((file) => {
                if (file !== null) {
                    return fs.closeAsync(file);
                }
            }));
        }).then(() => {
            return Indexer.makeDirs(indexName).then(() => {
                return fs.renameAsync(tmpName, indexName);
            }).catch(() => {
                return fs.unlinkAsync(tmpName);
            });
        });
    }

    static makeDirs(indexName) {
        let parts = path.relative(config.indexPath, path.dirname(indexName)).split(path.sep);
        let promise = Promise.resolve(config.indexPath);
        for (let part of parts) {
            promise = promise.then((base) => {
                let dir = path.join(base, part);
                return fs.mkdirAsync(dir).then(() => {
                    return dir;
                });
            });
        }
        return promise;
    }

}

module.exports = Indexer;
