'use strict';

const config = require('../config');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const VideoLib = require('node-video-lib');

class Indexer {

    static getIndexName(name) {
        let indexPart = crypto.createHash('md5').update(name).digest('hex');
        return path.join(config.indexPath, indexPart.slice(0, 2), indexPart.slice(2, 4), `${indexPart}.idx`);
    }

    static index(name) {
        let fileName = path.join(config.mediaPath, name);
        let indexName = Indexer.getIndexName(name);
        let tmpName = path.join(config.indexPath, `${crypto.randomBytes(16).toString('hex')}.tmp`);

        let file = null;
        let index = null;

        try {
            file = fs.openSync(fileName, 'r');
            index = fs.openSync(tmpName, 'w');
            let movie = VideoLib.MovieParser.parse(file);
            let fragmentList = VideoLib.FragmentListBuilder.build(movie, config.fragmentDuration);
            VideoLib.FragmentListIndexer.index(fragmentList, index);
        } finally {
            if (file !== null) {
                fs.closeSync(file);
            }
            if (index !== null) {
                fs.closeSync(index);
            }
        }

        if (fs.existsSync(tmpName)) {
            try {
                Indexer.makeDirs(path.dirname(indexName));
                fs.renameSync(tmpName, indexName);
            } catch (ex) {
                fs.unlinkSync(tmpName);
                throw ex;
            }
        }
    }

    static makeDirs(dirs) {
        let parts = path.relative(config.indexPath, dirs).split(path.sep);
        let base = config.indexPath;
        for (let part of parts) {
            let dir = path.join(base, part);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            base = dir;
        }
    }

}

module.exports = Indexer;
