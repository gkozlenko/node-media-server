'use strict';

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
        return messages.pop();
    }

}

module.exports = MessageQueue;
