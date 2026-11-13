'use strict';
// Pin the timezone before moment is loaded so date formatting is deterministic
process.env.TZ = 'UTC';

const {describe, test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const NejiUtils = require('../lib/nejiutils.js');

const utils = new NejiUtils();
const FIXTURE = path.join(__dirname, 'fixtures', 'hash.txt');

describe('NejiUtils - netmask', () => {
    test('getSubnetDetails returns block details for a /24', () => {
        const block = utils.getSubnetDetails('192.168.1.0/24');
        assert.equal(block.base, '192.168.1.0');
        assert.equal(block.mask, '255.255.255.0');
        assert.equal(block.hostmask, '0.0.0.255');
        assert.equal(block.bitmask, 24);
        assert.equal(block.first, '192.168.1.1');
        assert.equal(block.last, '192.168.1.254');
        assert.equal(block.broadcast, '192.168.1.255');
        assert.equal(block.size, 256);
    });

    test('getSubnetDetails handles /32, /31 and /30 edge cases', () => {
        const b32 = utils.getSubnetDetails('10.0.0.0/32');
        assert.deepEqual([b32.first, b32.last, b32.broadcast, b32.size], ['10.0.0.0', '10.0.0.0', undefined, 1]);
        const b31 = utils.getSubnetDetails('10.0.0.0/31');
        assert.deepEqual([b31.first, b31.last, b31.broadcast, b31.size], ['10.0.0.0', '10.0.0.1', undefined, 2]);
        const b30 = utils.getSubnetDetails('10.0.0.0/30');
        assert.deepEqual([b30.first, b30.last, b30.broadcast, b30.size], ['10.0.0.1', '10.0.0.2', '10.0.0.3', 4]);
    });

    test('getSubnetDetails returns expected sizes for /24 to /29', () => {
        const expected = {24: 256, 25: 128, 26: 64, 27: 32, 28: 16, 29: 8};
        for (const [bits, size] of Object.entries(expected)) {
            assert.equal(utils.getSubnetDetails('10.0.0.0/' + bits).size, size, '/' + bits);
        }
    });

    test('getSubnetDetails throws on invalid input', () => {
        assert.throws(() => utils.getSubnetDetails('example.com'));
        assert.throws(() => utils.getSubnetDetails('300.1.1.1/24'));
    });

    test('validateTargetAddress expands a netmask into its usable addresses', () => {
        const result = utils.validateTargetAddress('10.0.0.0/29');
        assert.equal(result.status, true);
        assert.match(result.debug, /IPv4Netmask/);
        assert.deepEqual(result.data, ['10.0.0.1', '10.0.0.2', '10.0.0.3', '10.0.0.4', '10.0.0.5', '10.0.0.6']);
    });

    test('validateTargetAddress accepts a single IPv4 address', () => {
        const result = utils.validateTargetAddress('1.2.3.4');
        assert.equal(result.status, true);
        assert.match(result.debug, /"IPv4" type/);
        assert.deepEqual(result.data, ['1.2.3.4']);
    });

    test('validateTargetAddress accepts a hostname', () => {
        const result = utils.validateTargetAddress('example.com');
        assert.equal(result.status, true);
        assert.match(result.debug, /"host" type/);
        assert.deepEqual(result.data, ['example.com']);
    });

    test('validateTargetAddress rejects invalid input', () => {
        for (const input of ['1.2.3.999', '', null]) {
            const result = utils.validateTargetAddress(input);
            assert.equal(result.status, false, String(input));
            assert.deepEqual(result.data, [], String(input));
        }
    });
});

describe('NejiUtils - moment', () => {
    test('unixDateToString formats the epoch', () => {
        assert.equal(utils.unixDateToString(0), '1970/01/01 00:00:00.000');
        assert.equal(utils.unixDateToString(1790000000123), '2026/09/21 14:13:20.123');
    });

    test('getCurrentFormattedDateTime uses the default format', () => {
        assert.match(utils.getCurrentFormattedDateTime(), /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
    });

    test('getCurrentFormattedDateTime respects a custom format', () => {
        assert.equal(utils.getCurrentFormattedDateTime('YYYY'), String(new Date().getUTCFullYear()));
    });

    test('getCurrentISODateTime returns a valid ISO 8601 string', () => {
        const iso = utils.getCurrentISODateTime();
        assert.equal(new Date(iso).toISOString(), iso);
        assert.ok(Math.abs(Date.parse(iso) - Date.now()) < 1000);
    });

    test('getCurrentUnixDateTime returns the current epoch in milliseconds', () => {
        const now = utils.getCurrentUnixDateTime();
        assert.equal(typeof now, 'number');
        assert.ok(Math.abs(now - Date.now()) < 1000);
    });
});

describe('NejiUtils - crypto / fs', () => {
    test('getFileHash defaults to SHA256', () => {
        assert.equal(utils.getFileHash(FIXTURE), 'a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447');
    });

    test('getFileHash supports other algorithms', () => {
        assert.equal(utils.getFileHash(FIXTURE, 'md5'), '6f5902ac237024bdd0c176cb93063dc4');
    });

    test('getFileHash throws for a missing file', () => {
        assert.throws(() => utils.getFileHash(path.join(__dirname, 'fixtures', 'missing.txt')), {code: 'ENOENT'});
    });

    test('buildHash of an empty object is the SHA256 of an empty string', () => {
        assert.equal(utils.buildHash({}), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    test('buildHash hashes concatenated values', () => {
        assert.equal(utils.buildHash({a: 'hello'}), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    test('buildHash JSON encodes nested objects', () => {
        assert.equal(utils.buildHash({a: 'x', b: {c: 1}}), '9dc4727aa4a6ef5575f3c1be0f9bec532fa9c01f51ac137133bce4eee26ef2ae');
    });

    test('buildHash produces different hashes for different input', () => {
        assert.notEqual(utils.buildHash({a: 1}), utils.buildHash({b: 2}));
    });

    test('buildHash does not throw on null values', () => {
        assert.doesNotThrow(() => utils.buildHash({a: null}));
        assert.notEqual(utils.buildHash({a: null, b: 'x'}), utils.buildHash({}));
    });
});
describe('NejiUtils - validation', () => {
    const validIPv4 = ['0.0.0.0', '192.168.1.1', '255.255.255.255', '010.1.1.1'];
    const invalidIPv4 = ['256.1.1.1', '1.2.3', '1.2.3.4.5', '1x2x3x4', 'hello', '', '1.2.3.4/24'];

    test('isValidIPv4 accepts valid addresses', () => {
        for (const address of validIPv4) {
            assert.equal(utils.isValidIPv4(address), true, address);
        }
    });

    test('isValidIPv4 rejects invalid addresses', () => {
        for (const address of invalidIPv4) {
            assert.equal(utils.isValidIPv4(address), false, address);
        }
    });

    const label63 = 'a'.repeat(63);
    const validHosts = ['example.com', 'a', 'my-host.example.com', 'example.com.', label63 + '.com'];
    const invalidHosts = ['-bad.com', 'bad-.com', 'a'.repeat(64) + '.com', (label63 + '.').repeat(4) + 'com', 'under_score.com', 'a..b', ''];

    test('isValidHost accepts valid hostnames', () => {
        for (const host of validHosts) {
            assert.equal(utils.isValidHost(host), true, host);
        }
    });

    test('isValidHost rejects invalid hostnames', () => {
        for (const host of invalidHosts) {
            assert.equal(utils.isValidHost(host), false, host);
        }
    });

    test('isValidIPv4Netmask accepts /24 to /29', () => {
        for (const address of ['10.0.0.0/24', '10.0.0.0/29']) {
            assert.equal(utils.isValidIPv4Netmask(address), true, address);
        }
    });

    test('isValidIPv4Netmask rejects other masks and plain addresses', () => {
        for (const address of ['10.0.0.0/23', '10.0.0.0/30', '10.0.0.0/2', '1.2.3.4', '10x0x0x0/24']) {
            assert.equal(utils.isValidIPv4Netmask(address), false, address);
        }
    });

    test('static IPv4 pattern does not treat "." as a wildcard', () => {
        assert.equal(new RegExp(NejiUtils.RegexPatternValidIPV4Address).test('1x2x3x4'), false);
        assert.equal(new RegExp(NejiUtils.RegexPatternValidIPV4Netmask).test('10x0x0x0/24'), false);
        assert.equal(new RegExp(NejiUtils.RegexPatternValidHostname).test('under_score.com'), false);
    });
});
describe('NejiUtils - ping output patterns', () => {
    const linuxOutput = [
        '4 packets transmitted, 4 received, 0% packet loss, time 3004ms',
        'rtt min/avg/max/mdev = 0.045/0.061/0.077/0.012 ms'
    ].join('\n');
    const win32Output = [
        '    Packets: Sent = 4, Received = 3, Lost = 1 (25% loss),',
        'Approximate round trip times in milli-seconds:',
        '    Minimum = 1ms, Maximum = 3ms, Average = 2ms'
    ].join('\n');

    test('all static patterns compile', () => {
        const names = [
            'RegexPatternValidIPV4Netmask', 'RegexPatternValidIPV4Address', 'RegexPatternValidHostname',
            'RegexPatternRawDate', 'RegexPattenRawTime', 'RegexPatternRoundDownTimer', 'RegexPatternRoundUpTimer',
            'RegexPatternLinuxPingPacket', 'RegexPatternLinuxStatsRegex', 'RegexPatternWIN32PacketRegex',
            'RegexPatternWIN32StatsRegex'
        ];
        for (const name of names) {
            assert.equal(typeof NejiUtils[name], 'string', name);
            assert.doesNotThrow(() => new RegExp(NejiUtils[name]), name);
        }
    });

    test('Linux packet pattern extracts sent/received', () => {
        const match = new RegExp(NejiUtils.RegexPatternLinuxPingPacket).exec(linuxOutput);
        assert.deepEqual({...match.groups}, {sent: '4', received: '4'});
    });

    test('Linux stats pattern extracts min/avg/max/mdev', () => {
        const match = new RegExp(NejiUtils.RegexPatternLinuxStatsRegex).exec(linuxOutput);
        assert.deepEqual({...match.groups}, {min: '0.045', avg: '0.061', max: '0.077', mdev: '0.012'});
    });

    test('WIN32 packet pattern extracts sent/received/lost', () => {
        const match = new RegExp(NejiUtils.RegexPatternWIN32PacketRegex).exec(win32Output);
        assert.deepEqual({...match.groups}, {sent: '4', received: '3', lost: '1'});
    });

    test('WIN32 stats pattern extracts min/max/avg', () => {
        const match = new RegExp(NejiUtils.RegexPatternWIN32StatsRegex).exec(win32Output);
        assert.deepEqual({...match.groups}, {min: '1', max: '3', avg: '2'});
    });
});

describe('NejiUtils - formatting', () => {
    test('formatDateTime formats a yyyymmdd date', () => {
        assert.equal(utils.formatDateTime('20260929', '-', 'date'), '2026-09-29');
    });

    test('formatDateTime formats a hhmmss time', () => {
        assert.equal(utils.formatDateTime('123456', ':', 'time'), '12:34:56');
    });

    test('formatDateTime returns an empty string for unknown types', () => {
        assert.equal(utils.formatDateTime('123456', ':', 'other'), '');
    });

    test('buildRTime rounds minutes 0-4 down to 0', () => {
        assert.equal(utils.buildRTime('123456'), '123000');
    });

    test('buildRTime rounds minutes 5-9 down to 5', () => {
        assert.equal(utils.buildRTime('123756'), '123500');
    });

    test('mysqlEscape escapes backslashes and quotes', () => {
        assert.equal(utils.mysqlEscape('a\\b'), 'a\\\\b');
        assert.equal(utils.mysqlEscape('it\'s'), 'it\\\'s');
        assert.equal(utils.mysqlEscape('say "hi"'), 'say \\"hi\\"');
    });

    test('mysqlEscape escapes control characters', () => {
        assert.equal(utils.mysqlEscape('a\nb'), 'a\\nb');
        assert.equal(utils.mysqlEscape('a\rb'), 'a\\rb');
        assert.equal(utils.mysqlEscape('a\x00b'), 'a\\0b');
        assert.equal(utils.mysqlEscape('a\x1ab'), 'a\\Zb');
    });

    test('mysqlEscape converts non-strings', () => {
        assert.equal(utils.mysqlEscape(42), '42');
    });

    test('mysqlTruncColumn truncates to the given length', () => {
        assert.equal(utils.mysqlTruncColumn('abcdef', 3), 'abc');
        assert.equal(utils.mysqlTruncColumn(12345, 2), '12');
    });

    test('mysqlTruncColumn defaults to 4000 characters', () => {
        assert.equal(utils.mysqlTruncColumn('x'.repeat(5000)).length, 4000);
        assert.equal(utils.mysqlTruncColumn('short'), 'short');
    });

    test('padValue pads with zeros', () => {
        assert.equal(utils.padValue(5), '05');
        assert.equal(utils.padValue('7'), '07');
        assert.equal(utils.padValue(5, 4), '0005');
        assert.equal(utils.padValue(123), '123');
    });

    test('defaultValue returns the value or the default', () => {
        assert.equal(utils.defaultValue('x'), 'x');
        assert.equal(utils.defaultValue(null), 'N/A');
        assert.equal(utils.defaultValue(undefined), 'N/A');
        assert.equal(utils.defaultValue(null, '-'), '-');
    });

    test('defaultValue treats all falsy values as missing', () => {
        // Current behaviour: 0, '' and false are replaced by the default
        assert.equal(utils.defaultValue(0), 'N/A');
        assert.equal(utils.defaultValue(''), 'N/A');
        assert.equal(utils.defaultValue(false), 'N/A');
    });

    test('getNumericValue strips units', () => {
        assert.equal(utils.getNumericValue('12.5 ms'), '12.5');
        assert.equal(utils.getNumericValue('-3%'), '-3');
    });

    test('getNumericValue returns the default when there are no digits', () => {
        assert.equal(utils.getNumericValue('abc'), 0);
        assert.equal(utils.getNumericValue('abc', -1), -1);
    });

    test('getTableSuffix maps every known interval', () => {
        const expected = {
            '0.25': '01', '0.5': '01', '0.75': '01', '1': '01', '5': '05', '10': '10',
            '15': '15', '30': '30', '60': '60', '1440': 'day'
        };
        for (const [interval, suffix] of Object.entries(expected)) {
            assert.equal(utils.getTableSuffix(interval), suffix, interval);
            assert.equal(utils.getTableSuffix(Number(interval)), suffix, 'number ' + interval);
        }
    });

    test('getTableSuffix falls back for unknown intervals', () => {
        assert.equal(utils.getTableSuffix(7), 'ddddd');
    });

    test('convertIPv4ToInt converts addresses to integers', () => {
        assert.equal(utils.convertIPv4ToInt('0.0.0.0'), 0);
        assert.equal(utils.convertIPv4ToInt('10.0.0.1'), 167772161);
        assert.equal(utils.convertIPv4ToInt('192.168.1.1'), 3232235777);
        assert.equal(utils.convertIPv4ToInt('255.255.255.255'), 4294967295);
    });

    test('buildRandomString returns the requested length and charset', () => {
        const value = utils.buildRandomString(32);
        assert.equal(value.length, 32);
        assert.match(value, /^[A-Za-z0-9]+$/);
    });

    test('buildRandomString returns an empty string for length 0', () => {
        assert.equal(utils.buildRandomString(0), '');
    });
});
