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

class ForbiddenError extends HttpError {

    constructor(message) {
        super(403, message);
        this.name = 'ForbiddenError';
    }

}

class UnauthorizedError extends HttpError {

    constructor(message) {
        super(401, message);
        this.name = 'UnauthorizedError';
    }

}

module.exports = {
    HttpError,
    NotFoundError,
    ForbiddenError,
    UnauthorizedError,
};
