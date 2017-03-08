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
        //return path.join(config.indexPath, indexPart.slice(0, 2), indexPart.slice(2, 4), `${indexPart}.idx`);
        return path.join(config.indexPath, `${indexPart}.idx`);
    }

    static index(name) {
        let fileName = path.join(config.mediaPath, name);
        let indexName = Indexer.getIndexName(name);
        let postfix = _.random(100000, 999999);
        let file = null;
        let index = null;

        return Promise.all([
            fs.openAsync(fileName, 'r').then((fd) => {
                file = fd;
            }),
            fs.openAsync(`${indexName}.${postfix}`, 'w').then((fd) => {
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
            return fs.renameAsync(`${indexName}.${postfix}`, indexName);
        });
    }

}

module.exports = Indexer;
