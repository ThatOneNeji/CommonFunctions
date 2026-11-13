'use strict';
const {describe, test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const log4js = require('log4js');
const Logger = require('../lib/logger.js');

// Keep log files out of the repo
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commonfunctions-logger-'));
const logFile = path.join(tmpDir, 'test.log');

describe('Logger', () => {
    after(() => {
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    test('defaults the owner to UNKNOWN', () => {
        const logging = new Logger({logFile});
        assert.equal(logging.ownerName, 'UNKNOWN');
    });

    test('getOwnerFormatted pads to 10 characters and uppercases', () => {
        const logging = new Logger({owner: 'app', logFile});
        assert.equal(logging.getOwnerFormatted(), '[       APP] ');
        logging.setOwner('averyverylongname');
        assert.equal(logging.getOwnerFormatted(), '[AVERYVERYLONGNAME] ');
    });

    test('creates a system logger', () => {
        const logging = new Logger({logFile});
        for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) {
            assert.equal(typeof logging.system[level], 'function', level);
        }
        assert.equal(logging.system.category, '[   UNKNOWN] SYSTEM');
    });

    test('creates the requested logging areas', () => {
        const logging = new Logger({owner: 'app', areas: ['Web', 'db'], logFile});
        assert.equal(typeof logging.web.info, 'function');
        assert.equal(typeof logging.db.info, 'function');
        assert.equal(logging.web.category, '[       APP] WEB');
    });

    test('createLoggingArea refuses duplicates', () => {
        const logging = new Logger({logFile});
        assert.equal(logging.createLoggingArea('jobs'), true);
        assert.equal(logging.createLoggingArea('JOBS'), false);
    });

    test('getBasicConfig is accepted by log4js.configure', () => {
        const logging = new Logger({logFile});
        const config = logging.getBasicConfig();
        assert.equal(config.appenders.localFile.filename, logFile);
        assert.doesNotThrow(() => log4js.configure(config));
    });

    test('level defaults to debug', () => {
        const logging = new Logger({logFile});
        assert.equal(logging.getBasicConfig().categories.default.level, 'debug');
        assert.equal(logging.system.isDebugEnabled(), true);
    });

    test('level option is applied to the default category', () => {
        const logging = new Logger({level: 'warn', areas: ['web'], logFile});
        assert.equal(logging.getBasicConfig().categories.default.level, 'warn');
        assert.equal(logging.web.isInfoEnabled(), false);
        assert.equal(logging.web.isWarnEnabled(), true);
    });

    test('an invalid level is rejected by log4js', () => {
        assert.throws(() => new Logger({level: 'loud', logFile}));
    });

    test('logFile defaults to logs/server.log', () => {
        // getBasicConfig is called on the prototype so no file appender is created in the repo
        const config = Logger.prototype.getBasicConfig.call({});
        assert.equal(config.appenders.localFile.filename, 'logs/server.log');
    });

    test('getExpressLogger returns Express middleware', () => {
        const logging = new Logger({logFile});
        const middleware = logging.getExpressLogger();
        assert.equal(typeof middleware, 'function');
        assert.equal(middleware.length, 3);
    });
});

describe('Logger - file output', () => {
    let logging;
    before(() => {
        logging = new Logger({owner: 'filetest', areas: ['area'], logFile});
    });

    test('writes messages to the configured log file', async () => {
        logging.area.info('hello from the test suite');
        await new Promise((resolve) => log4js.shutdown(resolve));
        const content = fs.readFileSync(logFile, 'utf8');
        assert.match(content, /\[INFO\] \[  FILETEST\] AREA - hello from the test suite/);
    });
});
