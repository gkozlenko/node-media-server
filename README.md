# node-media-server

[![ESLint Status](https://github.com/gkozlenko/node-media-server/actions/workflows/eslint.yml/badge.svg)](https://github.com/gkozlenko/node-media-server/actions/workflows/eslint.yml)
[![GitHub License](https://img.shields.io/github/license/gkozlenko/node-video-lib.svg)](https://github.com/gkozlenko/node-video-lib/blob/master/LICENSE)

Node.js Media Server / VOD / HLS / Encryption

## Installation

```bash
git clone https://github.com/gkozlenko/node-media-server.git
cd node-media-server
npm install
```

## Configuration

Config is located in the `config/index.js` file.

```javascript
const config = {
    server: {
        // Timeout for graceful shutdown (in milliseconds)
        shutdownTimeout: 10000,
    },

    workers: {
        // Number of media worker threads
        count: require('os').cpus().length,
        // Timeout for worker graceful shutdown
        shutdownTimeout: 5000,
    },

    web: {
        // Host and port for the web server
        host: '0.0.0.0',
        port: 3000,
        // Path to static files
        staticPath: path.resolve('./public'),
        // Timeout for worker requests (in milliseconds)
        workerTimeout: 1000,
        // Timeout for web server graceful shutdown
        shutdownTimeout: 5000,
    },

    logger: {
        // Path to log files
        logPath: path.resolve('./logs'),
        // Log level (available levels: 'debug', 'info', 'warn' and 'error')
        level: 'debug',
        // Maximum log size in bytes
        maxSize: 50 * 1024 * 1024,
        // How many rotated log files to keep
        maxFiles: 10,
    },

    media: {
        // Video chunk duration (in seconds)
        fragmentDuration: 5,
        // Path to video files
        mediaPath: path.resolve('./media'),

        // Indexing configuration
        indexEnabled: true,
        // Path to index files
        indexPath: path.resolve('./index'),

        // Encryption configuration
        encryptionEnabled: false,
        encryptionSeed: 'CIPHER SEED',
    },
};
```

## Running

```bash
npm start
```

## Usage

Use such URL to play a video file using HLS protocol:

```text
http://host:port/vod/FILE_NAME/playlist.m3u8
```
