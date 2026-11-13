'use strict';
const {describe, test, mock, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');

// Replace amqp-connection-manager with a fake before MessageBroker loads it, so no broker is needed
const fakeAmqp = {
    connections: [],
    connect: mock.fn((urls, options) => {
        const connection = new EventEmitter();
        connection.urls = urls;
        connection.options = options;
        connection.channels = [];
        connection.close = mock.fn(() => Promise.resolve());
        connection.createChannel = mock.fn((channelOptions) => {
            const wrapper = {
                options: channelOptions,
                sendToQueue: mock.fn(() => Promise.resolve(true)),
                addSetup: mock.fn(),
                ack: mock.fn()
            };
            connection.channels.push(wrapper);
            return wrapper;
        });
        fakeAmqp.connections.push(connection);
        return connection;
    })
};
const amqpPath = require.resolve('amqp-connection-manager');
require.cache[amqpPath] = {id: amqpPath, filename: amqpPath, loaded: true, exports: fakeAmqp};

const MessageBroker = require('../lib/messagebroker.js');

/**
 * @return {object} A logger whose methods are all mocks
 */
function fakeLogger() {
    return {
        debug: mock.fn(),
        info: mock.fn(),
        warn: mock.fn(),
        error: mock.fn()
    };
}

const servers = [
    {host: 'mq1.local', port: 5672, active: true},
    {host: 'mq2.local', active: true},
    {host: 'mq3.local', port: 5673, active: false}
];
const credentials = {user: 'guest', password: 'secret'};

/**
 * @param {object} overrides Extra init options
 * @return {object} The broker, its fake logger and the fake connection
 */
function initBroker(overrides = {}) {
    const broker = new MessageBroker();
    const logger = fakeLogger();
    broker.init({logger, config: servers, credentials, publishQueueName: 'outbound', ...overrides});
    const connection = fakeAmqp.connections.at(-1);
    return {broker, logger, connection};
}

describe('MessageBroker - pure functions', () => {
    const broker = new MessageBroker();

    test('cleanQueueName strips separators', () => {
        assert.equal(broker.cleanQueueName('a,b_c.d/e'), 'abcde');
        assert.equal(broker.cleanQueueName('plain'), 'plain');
    });

    test('buildAMQPURL skips inactive servers and adds credentials and ports', () => {
        assert.deepEqual(broker.buildAMQPURL(servers, credentials), [
            'amqp://guest:secret@mq1.local:5672',
            'amqp://guest:secret@mq2.local'
        ]);
    });

    test('buildAMQPURL omits credentials unless both user and password are set', () => {
        assert.deepEqual(broker.buildAMQPURL(servers), ['amqp://mq1.local:5672', 'amqp://mq2.local']);
        assert.deepEqual(broker.buildAMQPURL(servers, {user: 'guest'}), ['amqp://mq1.local:5672', 'amqp://mq2.local']);
    });

    test('buildAMQPURL returns an empty list when no server is active', () => {
        assert.deepEqual(broker.buildAMQPURL([{host: 'x', active: false}], credentials), []);
    });

    test('queuePostTime returns the current epoch in milliseconds', () => {
        const now = broker.queuePostTime();
        assert.equal(typeof now, 'number');
        assert.ok(Math.abs(now - Date.now()) < 1000);
    });
});

describe('MessageBroker - init', () => {
    beforeEach(() => {
        fakeAmqp.connect.mock.resetCalls();
    });

    test('connects to the active servers with heartbeat and reconnect options', () => {
        const {connection} = initBroker();
        assert.equal(fakeAmqp.connect.mock.callCount(), 1);
        assert.deepEqual(connection.urls, ['amqp://guest:secret@mq1.local:5672', 'amqp://guest:secret@mq2.local']);
        assert.deepEqual(connection.options, {heartbeatIntervalInSeconds: 5, reconnectTimeInSeconds: 10});
    });

    test('creates a durable JSON publish channel', async () => {
        const {connection} = initBroker();
        const publish = connection.channels[0];
        assert.equal(publish.options.json, true);
        const channel = {assertQueue: mock.fn(() => Promise.resolve())};
        await publish.options.setup(channel);
        assert.deepEqual(channel.assertQueue.mock.calls[0].arguments, ['outbound', {durable: true}]);
    });

    test('warns when no publish queue is supplied', () => {
        const {logger, connection} = initBroker({publishQueueName: undefined});
        assert.equal(connection.channels.length, 0);
        assert.match(logger.warn.mock.calls[0].arguments[0], /Publish queue name was not supplied/);
    });

    test('exits when no credentials are supplied', (t) => {
        t.mock.method(process, 'exit', (code) => {
            throw new Error('exit ' + code);
        });
        assert.throws(() => initBroker({credentials: undefined}), /exit 1/);
        assert.equal(fakeAmqp.connect.mock.callCount(), 0);
    });

    test('logs connection events at the right level', () => {
        const {logger, connection} = initBroker();
        connection.emit('connect', {url: 'amqp://mq1.local'});
        connection.emit('disconnect', new Error('gone'));
        connection.emit('connectFailed', new Error('refused'));
        connection.emit('blocked', 'low memory');
        connection.emit('unblocked', 'ok');
        assert.ok(logger.info.mock.calls.some((c) => c.arguments[0] === 'Connected to: amqp://mq1.local'));
        assert.equal(logger.error.mock.callCount(), 2);
        assert.ok(logger.warn.mock.calls.some((c) => c.arguments[0] === 'low memory'));
        assert.ok(logger.debug.mock.calls.some((c) => c.arguments[0] === 'ok'));
    });
});

describe('MessageBroker - close', () => {
    test('closes the connection once and resets channels', async () => {
        const {broker, connection} = initBroker();
        await broker.close();
        assert.equal(connection.close.mock.callCount(), 1);
        assert.equal(broker.publishChannelWrapper, undefined);
        assert.deepEqual(broker.receiveChannelObject, {});
        await broker.close();
        assert.equal(connection.close.mock.callCount(), 1);
    });
});

describe('MessageBroker - consuming', () => {
    test('creates the consumer queue on connect', async () => {
        const {connection} = initBroker({receiveQueue: 'in.queue_1'});
        connection.emit('connect', {url: 'amqp://mq1.local'});
        const consumer = connection.channels.at(-1);
        const channel = {
            assertQueue: mock.fn(() => Promise.resolve()),
            prefetch: mock.fn(() => Promise.resolve()),
            consume: mock.fn(() => Promise.resolve())
        };
        await consumer.options.setup(channel);
        assert.deepEqual(channel.assertQueue.mock.calls[0].arguments, ['in.queue_1', {durable: true}]);
        assert.deepEqual(channel.prefetch.mock.calls[0].arguments, [1]);
        assert.equal(channel.consume.mock.calls[0].arguments[0], 'in.queue_1');
    });

    test('onMessage acks only when the external handover succeeds', () => {
        let accept = true;
        const {broker, connection} = initBroker({receiveQueue: 'in.queue', externalHandover: () => accept});
        connection.emit('connect', {url: 'amqp://mq1.local'});
        const consumer = connection.channels.at(-1);
        const message = {fields: {routingKey: 'in.queue'}, content: Buffer.from('{}')};

        broker.onMessage(message);
        assert.equal(consumer.ack.mock.callCount(), 1);
        assert.equal(consumer.ack.mock.calls[0].arguments[0], message);

        accept = false;
        broker.onMessage(message);
        assert.equal(consumer.ack.mock.callCount(), 1);
    });
});

describe('MessageBroker - publishing', () => {
    test('singlePublish stamps qtime and sends a persistent message', async () => {
        const {broker, connection} = initBroker();
        const publish = connection.channels[0];
        broker.singlePublish({queuename: 'outbound', data: {caid: 'c1', service: 's1'}});
        const [queue, data, options] = publish.sendToQueue.mock.calls[0].arguments;
        assert.equal(queue, 'outbound');
        assert.equal(data.caid, 'c1');
        assert.equal(typeof data.qtime, 'number');
        assert.deepEqual(options, {persistent: 1});
    });

    test('postMessageToQueue logs and resolves to false when sending fails', async () => {
        const {broker, logger, connection} = initBroker();
        const publish = connection.channels[0];
        const failure = new Error('channel closed');
        publish.sendToQueue.mock.mockImplementation(() => Promise.reject(failure));
        const result = await broker.postMessageToQueue({queuename: 'outbound', data: {}});
        assert.equal(result, false);
        assert.ok(logger.error.mock.calls.some((c) => c.arguments[0] === failure));
    });

    test('postMessageToQueue logs the sent message', async () => {
        const {broker, logger} = initBroker();
        await broker.postMessageToQueue({queuename: 'outbound', data: {caid: 'c9', service: 'ping'}});
        assert.ok(logger.debug.mock.calls.some((c) => c.arguments[0] === 'Sent message "c9" for "ping" to "outbound"'));
    });

    test('batchPublish sends every payload across multiple batches', () => {
        const {broker, connection} = initBroker();
        const publish = connection.channels[0];
        const payloads = Array.from({length: 2500}, (_, i) => ({queuename: 'outbound', data: {caid: i}}));
        assert.equal(broker.batchPublish(payloads), true);
        assert.equal(publish.sendToQueue.mock.callCount(), 2500);
        assert.equal(publish.sendToQueue.mock.calls[2499].arguments[1].caid, 2499);
        assert.ok(publish.sendToQueue.mock.calls.every((c) => typeof c.arguments[1].qtime === 'number'));
        // Current behaviour: the input array is emptied
        assert.equal(payloads.length, 0);
    });

    test('createPublishQueue adds a setup to an existing publish channel', async () => {
        const {broker, connection} = initBroker();
        const publish = connection.channels[0];
        broker.createPublishQueue('second');
        assert.equal(publish.addSetup.mock.callCount(), 1);
        const channel = {assertQueue: mock.fn(() => Promise.resolve())};
        await publish.addSetup.mock.calls[0].arguments[0](channel);
        assert.deepEqual(channel.assertQueue.mock.calls[0].arguments, ['second', {durable: true}]);
    });

    test('createPublishQueue initialises a publish channel when none exists', () => {
        const {broker, connection} = initBroker({publishQueueName: undefined});
        broker.publishChannelWrapper = undefined;
        broker.createPublishQueue('fresh');
        assert.equal(connection.channels.length, 1);
        assert.equal(connection.channels[0].options.json, true);
    });
});
