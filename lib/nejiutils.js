'use strict';
const Netmask = require('netmask').Netmask;
const crypto = require('node:crypto');
const moment = require('moment');
const fs = require('node:fs');
const RegexPatterns = require('./regexpatterns.js');

/**
 * @class
 * @classdesc This is a description of the NejiUtils constructor function.
 */
class NejiUtils {
    /**
     * @constructor
     * @param {object} options This list contains names of any additional areas that need to be created on start
     * @description This is the constructor function for this class
     */
    constructor(options = {}) {
        this.options = options;
    }

    /**
     * @typedef {object} NetmaskObject
     * @property {number} maskLong xxx
     * @property {number} bitmask xxx
     * @property {number} netLong xxx
     * @property {number} size The number of IP address in the block (eg.: 254)
     * @property {string} base The address of the network block as a string (eg.: 216.240.32.0)
     * @property {string} mask The netmask as a string (eg.: 255.255.255.0)
     * @property {string} hostmask The host mask, the opposite of the netmask (eg.: 0.0.0.255)
     * @property {string} first The first usable address of the block
     * @property {string} last The last usable address of the block
     * @property {string} broadcast The block's broadcast address: the last address of the block (eg.: 192.168.1.255)
     * @description Netmask fields
     */

    /**
     *
     * @param {string} line String to truncate
     * @param {number} length String to truncate
     * @return {string} This is the r
     * @description This function truncates a string to not more than 4000 characters
     */
    mysqlTruncColumn(line, length = 4000) {
        return line.toString().slice(0, length);
    }

    /**
     *
     * @param {string} line String to escape
     * @return {string} This is the return string
     * @description This function applies escapes on the line that gets sent to MySQL
     */
    mysqlEscape(line) {
        return line.toString()
            .replaceAll('\\', '\\\\')
            .replaceAll('\'', String.raw`\'`)
            .replaceAll('\"', '\\\"')
            .replaceAll('\n', '\\n')
            .replaceAll('\r', '\\r')
            .replaceAll('\x00', '\\0')
            .replaceAll('\x1a', '\\Z');
    }

    /**
     *
     * @param {string} value Returned value after any required padding
     * @param {number} padding An optional range for how much padding is needed.
     * @return {string} This is the returning data
     * @description This pads an item default of 2 '0's
     */
    padValue(value, padding = 2) {
        return value.toString().padStart(padding, '0');
    }

    /**
     *
     * @param {string} datetimeRaw The string that we need to format
     * @param {string} separator Seperator
     * @param {string} type The type of the item
     * @return {string} This is the returning value after formatting
     * @description This function formats the raw datetime
     */
    formatDateTime(datetimeRaw, separator, type) {
        switch (type) {
            case 'time':
                return String(datetimeRaw).replace(new RegExp(NejiUtils.RegexPattenRawTime, 'g'), separator);
            case 'date':
                return String(datetimeRaw).replace(new RegExp(NejiUtils.RegexPatternRawDate), '$1' + separator + '$2' + separator + '$3');
        }
        return '';
    }

    /**
     *
     * @param {type} unixdate
     * @return {string}
     * @description This returns the unix date time in an ISO8601 manner.
     */
    unixDateToString(unixdate) {
        return moment(unixdate).format('YYYY/MM/DD HH:mm:ss.SSS').valueOf();
    }

    /**
     *
     * @param {string} time time value that needs to be rounded to '0' or '5'
     * @return {string} This is the returning value
     * @description This function rounds down or up the time for rdate columns
     */
    buildRTime(time) {
        const roundDown = new RegExp(NejiUtils.RegexPatternRoundDownTimer);
        if (roundDown.test(time)) {
            return time.replace(roundDown, '$1' + '000');
        }
        const roundUp = new RegExp(NejiUtils.RegexPatternRoundUpTimer);
        if (roundUp.test(time)) {
            return time.replace(roundUp, '$1' + '500');
        }
        return time;
    }

    /**
     *
     * @param {*} value This is the value to check if it is null
     * @param {*} defValue
     * @return {string} This is the returning data
     * @description This function returns a default value if the variable is null
     */
    defaultValue(value, defValue = 'N/A') {
        if (value) {
            return value;
        }
        return defValue;
    }

    /**
     *
     * @param {string} filename File that has to get its hash
     * @param {string} hashtype Hash type,default SHA256
     * @return {string} This is the returning hash based on the data given to it
     * @description This function returns a hashed sha256 string of the supplied param
     */
    getFileHash(filename, hashtype = 'SHA256') {
        const readFile = fs.readFileSync(filename);
        return crypto.createHash(hashtype).update(readFile).digest('hex');
    }

    /**
     *
     * @param {*} msg This is the data to be hashed
     * @return {string} This is the returning hash based on the data given to it
     * @description This function returns a hashed sha256 string of the supplied param
     */
    buildHash(msg) {
        let str = '';
        for (const k in msg) {
            if (Object.hasOwn(msg, k)) {
                if (msg[k] !== null && msg[k] !== undefined && msg[k].constructor === Object) {
                    str += JSON.stringify(msg[k]);
                } else {
                    str += msg[k];
                }
            }
        }
        const hash = crypto.createHash('sha256');
        hash.update(str);
        return hash.digest('hex');
    }

    /**
     *
     * @param {integer} stringlength This is the 'size' of the random string that must be generated
     * @return {string} This is the returning string
     * @description This function generates a random sized string based on the 'length' parameter
     */
    buildRandomString(stringlength) {
        const result = [];
        const characterList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characterList.length;
        for (let i = 0; i < stringlength; i++) {
            result.push(characterList.charAt(Math.floor(Math.random() * charactersLength)));
        }
        return result.join('');
    }

    /**
     *
     * @param {string} subnet - The subnet that needs to be actioned
     * @return {NetmaskObject} This is the returning object
     * @description This function generates an IP dump of the supplied subnet
     */
    getSubnetDetails(subnet) {
        return new Netmask(subnet);
    }

    /**
     *
     * @param {string} interval This is the interval to be checked
     * @return {string} This is the returning table suffix
     * @description This function determines which table suffix is needed
     */
    getTableSuffix(interval) {
        switch (interval.toString()) {
            case '0.25':
                return '01';
            case '0.5':
                return '01';
            case '0.75':
                return '01';
            case '1':
                return '01';
            case '5':
                return '05';
            case '10':
                return '10';
            case '15':
                return '15';
            case '30':
                return '30';
            case '60':
                return '60';
            case '1440':
                return 'day';
            default:
                return 'ddddd';
        }
    }

    /**
     *
     * @typedef {object} validateTargetAddressResult
     * @property {boolean} status This indicates if the vaildation was successful
     * @property {string} debug This field contains information of the checks. It can be used as feedback
     * @property {array} data The returning data contains a list of addresses or just the host
     * @description The returning data structure from testing the supplied host against the various validations
     */
    /**
     *
     * @param {string} host Host to check
     * @return {validateTargetAddressResult} The returning data structure from testing the supplied host against the various validations
     * @description This function validates the supplied variable 'host'
     */
    validateTargetAddress(host) {
        // Declare result object
        const validatedResults = {
            status: false,
            debug: '',
            data: []
        };
        // Check if target ip address contains a subnet
        if (this.isValidIPv4Netmask(host) && !validatedResults.status) {
            validatedResults.debug = 'Address "' + host + '" is of "IPv4Netmask" type';
            const block = new Netmask(host);
            block.forEach((ip) => {
                validatedResults.data.push(ip);
            });
            validatedResults.status = true;
        }
        // Check if target is an ip address
        if (this.isValidIPv4(host) && !validatedResults.status) {
            validatedResults.debug = 'Address "' + host + '" is of "IPv4" type';
            validatedResults.data.push(host);
            validatedResults.status = true;
        }
        // Check if target is a hostname
        if (this.isValidHost(host) && !validatedResults.status) {
            validatedResults.debug = 'Address "' + host + '" is of "host" type';
            validatedResults.data.push(host);
            validatedResults.status = true;
        }
        return validatedResults;
    }

    /**
     *
     * @param {string} value Item to be tested
     * @param {string} defValue Default value
     * @return {number} This indicates if the match was successful or not
     * @description This tests the supplied address against the predefined regex of IPv4 addresses
     */
    getNumericValue(value, defValue = 0) {
        const patt = /\d/g;
        if (patt.test(value)) {
            return value.replaceAll(/[^-0-9]\D+|%/g, '');
        }
        return defValue;
    }

    /**
     *
     * @param {string} format Optional parameter to use for formatting the current date time
     * @return {string}
     * @description Returns the current date time in an formatted manner
     */
    getCurrentFormattedDateTime(format = 'YYYY/MM/DD HH:mm:ss.SSS') {
        return moment().format(format);
    }

    /**
     *
     * @return {string}
     * @description Returns the current date time in an ISO8601 manner
     */
    getCurrentISODateTime() {
        return moment().toISOString();
    }

    /**
     *
     * @return {string}
     * @description Returns the current datetime
     */
    getCurrentUnixDateTime() {
        return moment().valueOf();
    }

    /**
     *
     * @param {string} address Item to be tested
     * @return {boolean} This indicates if the match was successful or not
     * @description This tests the supplied address against the predefined regex of IPv4 addresses
     */
    isValidIPv4(address) {
        return new RegExp(NejiUtils.RegexPatternValidIPV4Address).test(String(address));
    }

    /**
     *
     * @param {string} host Item to be tested
     * @return {boolean} This indicates if the match was successful or not
     * @description This tests the supplied address against the predefined regex of hosts
     */
    isValidHost(host) {
        if (host === null || host === undefined) {
            return false;
        }
        const value = String(host);
        if (!new RegExp(NejiUtils.RegexPatternValidHostname).test(value)) {
            return false;
        }
        // The top-level label may not be all-numeric (RFC 3696), so '1.2.3.999' is not a hostname
        const labels = value.replace(/\.$/, '').split('.');
        return labels.length === 1 || !/^\d+$/.test(labels[labels.length - 1]);
    }

    /**
     *
     * @param {string} address Item to be tested
     * @return {boolean} This indicates if the match was successful or not
     * @description This tests the supplied address against the predefined regex of netmask
     */
    isValidIPv4Netmask(address) {
        return new RegExp(NejiUtils.RegexPatternValidIPV4Netmask).test(String(address));
    }

    /**
     *
     * @param {string} ipv4 IPv4 address to be converted to integer
     * @return {number} The integer value of the supplied ipv4 address
     * @description This converts IPv4 address to integer
     */
    convertIPv4ToInt(ipv4) {
        const parts = ipv4.split('.');
        return ((parts[0] * (256 * 256 * 256)) + (parts[1] * (256 * 256)) + (parts[2] * 256) + Number(parts[3]));
    }
}

// The regex patterns now live in RegexPatterns. These pass-through getters keep
// the original NejiUtils.<name> statics working for existing consumers.
for (const name of RegexPatterns.patternNames) {
    Object.defineProperty(NejiUtils, name, {
        get: () => RegexPatterns[name],
        enumerable: false,
        configurable: true
    });
}

module.commandName = 'NejiUtils';
module.exports = NejiUtils;
module.helpText = 'Common functions used';
