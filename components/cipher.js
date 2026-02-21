'use strict';

const config = require('../config');
const crypto = require('crypto');

function cipherKey(name) {
    return crypto.createHash('sha256')
        .update(`${name}.${config.media.encryptionSeed}.key`)
        .digest()
        .subarray(0, 16);
}

function cipherIv(name) {
    return crypto.createHash('sha256')
        .update(`${name}.${config.media.encryptionSeed}.iv`)
        .digest()
        .subarray(0, 16);
}

function encryptChunk(name, buffer) {
    let cipher = crypto.createCipheriv('aes-128-cbc', cipherKey(name), cipherIv(name));
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
}

module.exports = {
    cipherKey,
    cipherIv,
    encryptChunk,
};
