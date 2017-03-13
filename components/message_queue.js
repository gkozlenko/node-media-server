'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const queues = {};

class MessageQueue {

    static add(queue, message) {
        if (!queues[queue]) {
            queues[queue] = {
                messages: []
            };
        }
        queues[queue].messages.push(message);
    }

    static receive(queue) {
        let messages = queues[queue] ? queues[queue].messages : [];
        return Promise.resolve(messages.pop());
    }

}

module.exports = MessageQueue;
