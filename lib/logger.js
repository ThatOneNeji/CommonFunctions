'use strict';
const log4js = require('log4js');
const namePadding = 10;

/**
 * @class
 * @classdesc This class deals with the logging functions needed.
 */
class Logger {
    /**
     *
     * @typedef {Object} loggingOptions
     * @property {string} level Level of logging: trace, debug, info, warn, error, fatal or off (default: debug)
     * @property {array} areas Areas to setup setup for logging
     * @property {string} owner Application name
     * @property {string} logFile Path of the log file (default: logs/server.log)
     * @description This object contains the configuration information for the logging subsystem
     */
    /**
     * @constructor
     * @param {loggingOptions} options This list contains names of any additional areas that need to be created on start
     */
    constructor(options = {}) {
        this.setOwner(options.owner || 'UNKNOWN');
        this.logFile = options.logFile || 'logs/server.log';
        this.level = options.level || 'debug';
        log4js.configure(this.getBasicConfig());
        this.system = log4js.getLogger(this.getOwnerFormatted() + 'SYSTEM');
        this.system.info('Main logging initialised');
        if (options.areas) {
            for (const area of options.areas.sort()) {
                this.createLoggingArea(area);
            }
        }
    }

    /**
     *
     * @param {string} owner Name of the logger
     * @description Sets the name of the owner
     */
    setOwner(owner) {
        this.ownerName = owner;
    }

    /**
     *
     * @return {string} This returns the value for owner
     * @description This pads up and upper cases the owner
     */
    getOwnerFormatted() {
        return '[' + this.ownerName.toUpperCase().padStart(namePadding, ' ') + '] ';
    }

    /**
     *
     * @return {object} This is the default config for log4js
     * @description This is the complete 'configuration' for the logging sub system
     */
    getBasicConfig() {
        return {
            appenders: {
                localConsole: {
                    type: 'console'
                },
                localFile: {
                    type: 'file',
                    filename: this.logFile || 'logs/server.log',
                    maxLogSize: 5242880,
                    backups: 20
                }
            },
            categories: {
                default: {
                    appenders: [
                        'localConsole', 'localFile'
                    ],
                    level: this.level || 'debug'
                },
                localFile: {
                    appenders: [
                        'localFile'
                    ],
                    level: 'error'
                }
            }
        };
    }

    /**
     *
     * @param {string} name Logger name
     * @param {string} level Level of logging required
     * @return {object} This log4js object that gets used by Express
     * @description This function returns an object that the 'express' sub system would use
     */
    getExpressLogger(name = 'EXPRESS', level = 'auto') {
        return log4js.connectLogger(log4js.getLogger(this.getOwnerFormatted() + name), {level: level});
    }

    /**
     *
     * @param {string} logname Name of the logger
     * @return {boolean} The result from trying to create a logging area
     * @description This function creates the required logging area
     */
    createLoggingArea(logname) {
        if (this[logname.toLowerCase()]) {
            this.system.warn('"' + logname.toLowerCase() + '"' + ' logger already exists ');
            return false;
        }

        this[logname.toLowerCase()] = log4js.getLogger(this.getOwnerFormatted() + logname.toUpperCase());
        this[logname.toLowerCase()].debug('"' + logname.toUpperCase() + '"' + ' logging area initialised');
        return true;
    }
}

module.commandName = 'Logger';
module.exports = Logger;
module.helpText = 'Logging subsystem';
