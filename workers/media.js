'use strict';

const config = require('../config');
const errors = require('../components/errors');
const media = require('../components/media');
const cipher = require('../components/cipher');

const FragmentListDto = require('../models/fragment-list-dto');

const { parentPort, workerData } = require('worker_threads');

const workerName = workerData && workerData.name ? workerData.name : 'media';
const logger = require('../components/logger').getLogger(workerName);

if (!parentPort) {
    logger.error('Media worker must be spawned as a Worker Thread');
    process.exit(1);
}

let isShuttingDown = false;
let shutdownTimer = null;
let activeTasks = 0;
let webPort = null;

function finalizeShutdown() {
    if (shutdownTimer) {
        clearTimeout(shutdownTimer);
    }

    if (webPort) {
        try {
            webPort.close();
        } catch (_err) {
            // ignore
        }
    }

    logger.info('Media worker successfully stopped.');
    process.exit(0);
}

async function getFragmentList({ filename }) {
    const mediaSession = media.openMedia(filename);
    try {
        const fragmentList = await mediaSession.getFragmentList();
        return FragmentListDto.encode(fragmentList);
    } finally {
        await mediaSession.close();
    }
}

async function getChunk({ filename, chunkIndex, useEncryption }) {
    const mediaSession = media.openMedia(filename);
    try {
        let chunk = await mediaSession.getChunk(chunkIndex);
        if (useEncryption) {
            chunk = cipher.encryptChunk(filename, chunk);
        }
        return {
            buffer: chunk.buffer,
        };
    } finally {
        await mediaSession.close();
    }
}

async function handleTask(task) {
    if (!task.requestId) {
        logger.warn(`Received "${task.action}" task without requestId, ignoring`);
        return;
    }

    if (isShuttingDown) {
        webPort.postMessage({
            requestId: task.requestId,
            error: 'Media worker is shutting down',
        });
        return;
    }

    logger.debug(`Handle "${task.action}" task, requestId: ${task.requestId}`);

    activeTasks++;
    try {
        let result;

        if (task.action === 'getFragmentList') {
            result = await getFragmentList(task);
        } else if (task.action === 'getChunk') {
            result = await getChunk(task);
        } else {
            throw new Error(`Unknown action: ${task.action}`);
        }

        const transferables = [];
        if (result && result.buffer instanceof ArrayBuffer) {
            if (ArrayBuffer.isView(result)) {
                if (result.byteOffset === 0 && result.byteLength === result.buffer.byteLength) {
                    transferables.push(result.buffer);
                }
            } else {
                transferables.push(result.buffer);
            }
        }

        webPort.postMessage({
            requestId: task.requestId,
            data: result,
        }, transferables);
    } catch (err) {
        logger.error(`Error processing "${task.action}" task:`, err);

        webPort.postMessage({
            requestId: task.requestId,
            error: {
                code: err instanceof errors.HttpError ? err.code : 500,
                message: err.message,
            },
        });
    } finally {
        activeTasks--;

        if (isShuttingDown && activeTasks === 0) {
            finalizeShutdown();
        }
    }
}

function handleUpdateWebChannel({ port }) {
    if (webPort) {
        try {
            webPort.close();
        } catch (err) {
            logger.error(`Error closing old web port ${webPort}:`, err);
        }
    }

    webPort = port;
    webPort.on('message', handleTask);
    logger.debug('Web channel connected.');
}

function shutdown() {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;

    logger.info('Stopping media worker...');

    if (activeTasks === 0) {
        finalizeShutdown();
        return;
    }

    logger.info(`Waiting for ${activeTasks} active tasks to finish...`);

    shutdownTimer = setTimeout(() => {
        logger.warn(`Shutdown timed out. Forcing exit. ${activeTasks} tasks dropped.`);
        process.exit(0);
    }, config.workers.shutdownTimeout || 5000);
}

// listen to messages from main thread
parentPort.on('message', (msg) => {
    if (msg.action === 'updateWebChannel') {
        handleUpdateWebChannel(msg);
    } else if (msg.action === 'shutdown') {
        shutdown();
    }
});

logger.info('Media worker started');
