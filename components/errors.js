'use strict';

class HttpError extends Error {

    constructor(code, message) {
        super(message);
        this.name = 'HttpError';
        this.code = code;
    }

}

class NotFoundError extends HttpError {

    constructor(message) {
        super(404, message);
        this.name = 'NotFoundError';
    }

}

class RequestTimeoutError extends HttpError {

    constructor(message) {
        super(408, message);
        this.name = 'RequestTimeoutError';
    }

}

class InternalServerError extends HttpError {

    constructor(message) {
        super(500, message);
        this.name = 'InternalServerError';
    }

}

class ServiceUnavailableError extends HttpError {

    constructor(message) {
        super(503, message);
        this.name = 'ServiceUnavailableError';
    }

}

module.exports = {
    HttpError,
    NotFoundError,
    RequestTimeoutError,
    InternalServerError,
    ServiceUnavailableError,
};
