'use strict';
const amqp = require('amqp-connection-manager');
const moment = require('moment');
let Logging;
let Connection;

/**
 * @class
 * @classdesc This class handles all message broker functions.
 */
class MessageBroker {
    /**
     * @constructor
     * @param {object} options This list contains names of any additional areas that need to be created on start
     * @description This is the constructor function for this class
     */
    constructor(options = {}) {
        // const goptions = options || {};
    }

    /**
     * @param {string} queuename This is the queuename that needs to be cleaned
     * @return {string} This should only contain a-Z characters
     * @description This function cleans up the queuename that is to be used
     */
    cleanQueueName(queuename) {
        return queuename.replace(/,/g, '').replace(/_/g, '').replace(/\./g, '').replace(/\//g, '');
    }

    /**
     * @typedef {Object} messageFields
     * @property {string} consumerTag consumerTag
     * @property {number} deliveryTag deliveryTag
     * @property {boolean} redelivered redelivered
     * @property {string} exchange exchange
     * @property {string} routingKey routingKey
     * @description This object holds the message fields
     */
    /**
     * @typedef {Object} messageProperties
     * @property {string} contentType undefined
     * @property {string} contentEncoding undefined
     * @property {Object} headers undefined
     * @property {string} deliveryMode undefined
     * @property {integer} priority undefined
     * @property {string} correlationId undefined
     * @property {string} replyTo undefined
     * @property {string} expiration undefined
     * @property {string} messageId undefined
     * @property {datetime} timestamp undefined
     * @property {string} type undefined
     * @property {string} userId undefined
     * @property {string} appId undefined
     * @property {string} clusterId undefined
     * @description Message properties for messages
     */
    /**
     * @typedef {Object} messageRecieved
     * @property {messageFields} fields messageFields
     * @property {messageProperties} properties properties
     * @property {Buffer} content content
     * @description Message received object
     */
    /**
     * @param {messageRecieved} data Message received object
     * @description Handler for incoming messages
     */
    onMessage(data) {
        const instanceName = cleanQueueName(data.fields.routingKey);
        if (externalHandover(data)) {
            receiveChannelObject[instanceName].ack(data);
        }
    }

    /**
     * @typedef {Object} messageBrokerServerSettings
     * @property {string} host Host name or address to use
     * @property {string} user Username to use
     * @property {string} password Pasword for above listed username
     * @property {string} port Port for host (optional)
     * @property {string} vhost The vhost to use (optional)
     * @property {string} active If this host should be used or not (optional)
     * @description This object contains the configuration information for the message broker sub system
     */
    /**
     * @param {messageBrokerServerSettings} config Array of possible message borker servers
     * @return {array} URLs of AMQP enabled message brokers
     * @description This function builds the URLs to use for AMQP connections
     */
    buildAMQPURL(config) {
        const messagebrokerservers = [];
        config.forEach((server) => {
            if (server.active) {
                let srvinstance = 'amqp://';
                if (server.user && server.password) {
                    srvinstance += server.user + ':' + server.password + '@';
                }
                srvinstance += server.host;
                if (server.port) {
                    srvinstance += ':' + server.port;
                }
                messagebrokerservers.push(srvinstance);
            }
        });
        return messagebrokerservers;
    }

    /**
     * @param {*} queueNames
     * @description Create additional queues
     */
    createAdditionalConsumerQueues(queueNames) {
        createConsumerQueue(queueNames);
    }

    /**
     * @param {string} queueName queueName
     * @description This function creates a consumer queue
     */
    createConsumerQueue(queueName) {
        const instanceName = this.cleanQueueName(queueName);
        receiveChannelObject[instanceName] = Connection.createChannel({
            setup: function(channel) {
                return Promise.all([
                    channel.assertQueue(queueName, this.createChannelOptions),
                    channel.prefetch(1),
                    channel.consume(queueName, onMessage)
                ]);
            }
        });
    }

    /**
     * @param {string} queueName Name to use for the publsih queue
     * @description This function creates a publiching queue
     */
    initialisePublishQueue(queueName) {
        if (queueName) {
            this.publishChannelWrapper = Connection.createChannel({
                json: true,
                setup: function(channel) {
                    return channel.assertQueue(queueName, this.createChannelOptions);
                }
            });
            Logging.debug('Publish queue "' + queueName + '" has been created');
        } else {
            Logging.warn('Publish queue name was not supplied');
        }
    }

    /**
     * @typedef {Object} messageBrokerOptions
     * @property {function} logger Logger to pass on to the messagebroker so that it can log messages
     * @property {messageBrokerServerSettings} config Configuration for the RabbitMQ server
     * @property {string} receiveQueue This is the queue to consume from
     * @property {string} receiveQueueName This is the name of the consume instance
     * @property {function} externalHandover This function is called from the message broker in order to action incoming data
     * @description Options needed for the message broker
     */
    /**
     * @param {messageBrokerOptions} options Name to use for the publsih queue
     * @description his function initialisies the messagebroker
     */
    init(options = {}) {
        this.receiveChannelObject = {};
        this.publishChannelOptions = {
            persistent: 1
        };
        this.createChannelOptions = {
            durable: true
        };

        Logging = options.logger;
        Logging.info('Initialising message broker');
        this.settings = options.config;
        this.receiveQueue = options.receiveQueue || false;
        this.publishQueue = options.publishQueueName || false;
        this.externalHandover = options.externalHandover || false;
        Connection = amqp.connect(this.buildAMQPURL(this.settings));
        Connection.on('connect', function(connection) {
            Logging.debug('Connected to: ' + connection.url);
            if (this.receiveQueue) {
                this.createConsumerQueue(this.receiveQueue);
            }
        });

        Connection.on('disconnect', function(err) {
            Logging.error(err);
            Connection.close();
        });

        this.initialisePublishQueue(this.publishQueue);
    }

    /**
     * @typedef {Object} messageDataPacket
     * @property {string} qtime Time when the message broker sub system received the msg
     * @property {string} data data
     * @description Object containing the data packet
     */
    /**
     * @typedef {Object} queueMessageType
     * @property {string} queuename Name of the queue that the data needs to be sent to
     * @property {messageDataPacket} data Object containing the data packet
     * @description Object for message types
     */
    /**
     * @param {queueMessageType} msg Object for message types
     * @description Post message to the queue
     */
    postMessageToQueue(msg) {
        this.publishChannelWrapper.sendToQueue(msg.queuename, msg.data, publishChannelOptions)
            .then(function(ok) {
                let returnMessage = 'Sent message "';
                returnMessage += msg.data.caid;
                returnMessage += '" for "';
                returnMessage += msg.data.service;
                returnMessage += '" to "';
                returnMessage += msg.queuename;
                returnMessage += '"';
                Logging.debug(returnMessage);
                return ok;
            }).catch(function(err) {
                return Logging.error(err);
            });
    }

    /**
     * @param {string} queueName Name of the queue
     * @description Create a publich queue
     */
    createPublishQueue(queueName) {
        publishChannelWrapper.addSetup(function(channel) {
            return Promise.all([
                channel.assertQueue(queueName, { durable: true })
            ]);
        });
    }

    /**
     * @return {string} Epoch value for current time
     * @description This function returns the current time as a epoch value
     */
    queuePostTime() {
        return moment().valueOf();
    }

    /**
     * @param {queueMessageType} payload Object for message types
     * @description This function publishes a single msg
     */
    singlePublish(payload) {
        payload.data.qtime = this.queuePostTime();
        this.postMessageToQueue(payload);
    }

    /**
     * @param {array} payloads This is an array of msgs to be posted
     * @return {boolean} Successful is true
     * @description Batch publishing of messages
     */
    batchPublish(payloads) {
        const bar = new Promise((resolve, reject) => {
            payloads.forEach((payload, index, array) => {
                if (payload.data) {
                    payload.data.qtime = this.queuePostTime();
                }
                this.postMessageToQueue(payload);
                if (index === array.length - 1) resolve();
            });
        });

        bar.then(() => {
            console.log('All done!');
        });

        return true;
    }

    /**
     * @param {array} payloads
     * @return {boolean}
     * @description Batch publishing of messages V2
     */
    batchPublishV2(payloads) {
        for (const payload in payloads) {
            if (Object.hasOwnProperty.call(payloads, payload)) {
                const element = payloads[payload];
                if (element.data) {
                    element.data.qtime = this.queuePostTime();
                }
                this.postMessageToQueue(element);
            }
        }
        return true;
    }
}

module.commandName = 'MessageBroker';
module.exports = MessageBroker;
module.helpText = 'General message broker sub system';