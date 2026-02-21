'use strict';

const config = require('../config');
const errors = require('./errors');
const logger = require('./logger').getLogger('media');

const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');

const VideoLib = require('node-video-lib');

function indexName(filename) {
    const indexPart = crypto.createHash('sha256')
        .update(filename)
        .digest('hex')
        .substring(0, 32);
    return path.join(config.media.indexPath, indexPart.slice(0, 2), indexPart.slice(2, 4), `${indexPart}.idx`);
}

async function createIndex(filename, fragmentList) {
    const indexFilename = indexName(filename);
    const dir = path.dirname(indexFilename);
    const tempFilename = path.join(dir, `${crypto.randomBytes(16).toString('hex')}.tmp`);

    logger.debug(`Create index for media file: ${filename}`);

    let tempHandle = null;

    try {
        await fs.mkdir(dir, { recursive: true });

        tempHandle = await fs.open(tempFilename, 'w');
        VideoLib.FragmentListIndexer.index(fragmentList, tempHandle.fd);
        await tempHandle.close();
        tempHandle = null;

        await fs.rename(tempFilename, indexFilename);
    } catch (err) {
        if (tempHandle) {
            await tempHandle.close().catch((e) => {
                logger.error(`Failed to close temporary index file: ${tempFilename}`, e);
            });
        }

        await fs.unlink(tempFilename).catch((e) => {
            logger.error(`Failed to remove temporary index file: ${tempFilename}`, e);
        });

        logger.warn(`Unable to index file ${filename}`, err);
    }
}

async function getMediaHandle(session) {
    if (!session.mediaHandle) {
        const mediaFilename = path.join(config.media.mediaPath, session.filename);
        session.mediaHandle = await fs.open(mediaFilename, 'r');
    }
    return session.mediaHandle;
}

class MediaSession {

    constructor(filename) {
        this.filename = filename;
        this.fragmentList = null;
        this.mediaHandle = null;
        this.indexHandle = null;
    }

    async getFragmentList() {
        if (this.fragmentList) {
            return this.fragmentList;
        }

        if (config.media.indexEnabled) {
            const indexFilename = indexName(this.filename);
            try {
                this.indexHandle = await fs.open(indexFilename, 'r');
                this.fragmentList = VideoLib.FragmentListIndexer.read(this.indexHandle.fd);
                return this.fragmentList;
            } catch (err) {
                if (this.indexHandle) {
                    // close invalid index handle
                    await this.indexHandle.close().catch((e) => {
                        logger.error(`Failed to close index file: ${indexFilename}`, e);
                    });
                    this.indexHandle = null;
                }

                if (err.code !== 'ENOENT') {
                    // remove invalid index file
                    try {
                        await fs.unlink(indexFilename);
                    } catch (unlinkErr) {
                        logger.warn(`Failed to remove invalid index file: ${indexFilename}`, unlinkErr);
                    }
                }
            }
        }

        const handle = await getMediaHandle(this);
        const movie = VideoLib.MovieParser.parse(handle.fd);
        this.fragmentList = VideoLib.FragmentListBuilder.build(movie, config.media.fragmentDuration);

        if (config.media.indexEnabled && this.fragmentList) {
            await createIndex(this.filename, this.fragmentList).catch(err => {
                logger.error(`Unhandled error during index creation for ${this.filename}`, err);
            });
        }

        return this.fragmentList;
    }

    async getChunk(index) {
        const fragmentList = await this.getFragmentList();
        const fragment = fragmentList.get(index);
        if (!fragment) {
            throw new errors.NotFoundError('Chunk not found');
        }

        const handle = await getMediaHandle(this);
        const sampleBuffers = VideoLib.FragmentReader.readSamples(fragment, handle.fd);
        return VideoLib.HLSPacketizer.packetize(fragment, sampleBuffers);
    }

    async close() {
        const closePromises = [];

        const mHandle = this.mediaHandle;
        const iHandle = this.indexHandle;

        this.mediaHandle = null;
        this.indexHandle = null;

        if (mHandle) {
            closePromises.push(
                mHandle.close().catch((err) => {
                    logger.error(`Failed to close media file: ${this.filename}`, err);
                }),
            );
        }

        if (iHandle) {
            closePromises.push(
                iHandle.close().catch((err) => {
                    logger.error(`Failed to close index file: ${this.filename}`, err);
                }),
            );
        }

        if (closePromises.length > 0) {
            await Promise.all(closePromises);
        }
    }
}

function openMedia(filename) {
    return new MediaSession(filename);
}

module.exports = {
    openMedia,
};
