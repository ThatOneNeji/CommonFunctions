'use strict';
/*
 * Integration tests against a real RabbitMQ instance.
 * Skipped unless AMQP_HOST is set, e.g.:
 *   AMQP_HOST=rabbitmq.local AMQP_USER=user AMQP_PASSWORD=pass npm run test:integration
 * Optional: AMQP_PORT (default 5672).
 * Every queue created here is uniquely named and deleted afterwards.
 */
const {describe, test, after} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const amqplib = require('amqplib');
const MessageBroker = require('../lib/messagebroker.js');

const env = {
    host: process.env.AMQP_HOST,
    port: process.env.AMQP_PORT || 5672,
    user: process.env.AMQP_USER,
    password: process.env.AMQP_PASSWORD
};
const skip = env.host ? false : 'set AMQP_HOST (and AMQP_USER / AMQP_PASSWORD) to run against a real broker';
const url = 'amqp://' + encodeURIComponent(env.user || '') + ':' + encodeURIComponent(env.password || '') + '@' + env.host + ':' + env.port;
const TIMEOUT = 15000;

/**
 * @param {string} prefix Queue name prefix
 * @return {string} A unique queue name containing '.' and '_' to exercise cleanQueueName
 */
function uniqueQueue(prefix) {
    return prefix + '_test.' + crypto.randomBytes(4).toString('hex');
}

/**
 * @param {string[]} queues Queues to delete
 */
async function deleteQueues(queues) {
    if (!queues.length) {
        return;
    }
    const connection = await amqplib.connect(url);
    const channel = await connection.createChannel();
    for (const queue of queues) {
        await channel.deleteQueue(queue);
    }
    await connection.close();
}

/**
 * @return {object} A logger that records calls instead of printing
 */
function quietLogger() {
    const calls = [];
    const record = (level) => (...args) => calls.push({level, args});
    return {calls, debug: record('debug'), info: record('info'), warn: record('warn'), error: record('error')};
}

describe('amqplib against a real broker', {skip, timeout: TIMEOUT}, () => {
    test('connect, assert, send, get, ack and delete a queue', async () => {
        const queue = uniqueQueue('cf_amqplib');
        const connection = await amqplib.connect(url);
        try {
            const channel = await connection.createChannel();
            const ok = await channel.assertQueue(queue, {durable: false, autoDelete: false});
            assert.equal(ok.queue, queue);
            assert.equal(ok.messageCount, 0);

            assert.equal(channel.sendToQueue(queue, Buffer.from('hello')), true);
            let message = false;
            for (let i = 0; i < 20 && !message; i++) {
                message = await channel.get(queue);
                if (!message) {
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
            }
            assert.ok(message, 'message was not delivered');
            assert.equal(message.content.toString(), 'hello');
            assert.equal(message.fields.routingKey, queue);
            channel.ack(message);

            const deleted = await channel.deleteQueue(queue);
            assert.equal(deleted.messageCount, 0);
        } finally {
            await connection.close();
        }
    });

    test('rejects bad credentials', async () => {
        const badUrl = 'amqp://not-a-user:not-a-password@' + env.host + ':' + env.port;
        await assert.rejects(amqplib.connect(badUrl));
    });
});

describe('MessageBroker against a real broker', {skip, timeout: TIMEOUT}, () => {
    const queue = uniqueQueue('cf_broker');
    const received = [];
    const waiters = [];
    const logger = quietLogger();
    const broker = new MessageBroker();

    /**
     * @param {number} count Number of messages to wait for
     * @return {Promise} Resolves once that many messages have been received
     */
    function waitForMessages(count) {
        return new Promise((resolve, reject) => {
            const check = () => received.length >= count;
            if (check()) {
                return resolve();
            }
            const timer = setTimeout(() => reject(new Error('Only received ' + received.length + ' of ' + count)), TIMEOUT - 2000);
            waiters.push(() => {
                if (check()) {
                    clearTimeout(timer);
                    resolve();
                }
            });
        });
    }

    after(async () => {
        await broker.close();
        await deleteQueues(skip ? [] : [queue]);
    });

    test('init connects and consumes from the receive queue', async () => {
        const connected = new Promise((resolve) => {
            const original = logger.info;
            logger.info = (...args) => {
                original(...args);
                if (String(args[0]).startsWith('Connected to:')) {
                    resolve();
                }
            };
        });
        broker.init({
            logger,
            config: [{host: env.host, port: env.port, active: true}],
            credentials: {user: env.user, password: env.password},
            receiveQueue: queue,
            publishQueueName: queue,
            externalHandover: (message) => {
                received.push(message);
                waiters.forEach((fn) => fn());
                return true;
            }
        });
        await connected;
        assert.equal(logger.calls.filter((c) => c.level === 'error').length, 0, JSON.stringify(logger.calls));
    });

    test('singlePublish round trips a JSON message with qtime', async () => {
        broker.singlePublish({queuename: queue, data: {caid: 'single-1', service: 'integration'}});
        await waitForMessages(1);
        const body = JSON.parse(received[0].content.toString());
        assert.equal(body.caid, 'single-1');
        assert.equal(body.service, 'integration');
        assert.equal(typeof body.qtime, 'number');
        assert.equal(received[0].properties.deliveryMode, 2, 'message should be persistent');
        assert.equal(received[0].fields.routingKey, queue);
    });

    test('batchPublish delivers every message', async () => {
        const count = 50;
        const payloads = Array.from({length: count}, (_, i) => ({queuename: queue, data: {caid: 'batch-' + i, service: 'integration'}}));
        broker.batchPublish(payloads);
        await waitForMessages(1 + count);
        const ids = received.slice(1).map((m) => JSON.parse(m.content.toString()).caid).sort();
        assert.deepEqual(ids, Array.from({length: count}, (_, i) => 'batch-' + i).sort());
    });

    test('acked messages are removed from the queue', async () => {
        // Give the broker a moment to process the final ack
        await new Promise((resolve) => setTimeout(resolve, 500));
        const connection = await amqplib.connect(url);
        try {
            const channel = await connection.createChannel();
            const ok = await channel.checkQueue(queue);
            assert.equal(ok.messageCount, 0);
        } finally {
            await connection.close();
        }
    });
});
