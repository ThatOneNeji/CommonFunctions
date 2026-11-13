'use strict';
const {describe, test} = require('node:test');
const assert = require('node:assert/strict');
const RegexPatterns = require('../lib/regexpatterns.js');

const patterns = new RegexPatterns();

describe('RegexPatterns', () => {
    test('getRegexPatternDownloadIdType accepts 1 to 50 alphanumeric characters', () => {
        const regex = new RegExp(patterns.getRegexPatternDownloadIdType());
        for (const value of ['a', 'Z9', 'abc123XYZ', 'x'.repeat(50)]) {
            assert.equal(regex.test(value), true, value);
        }
    });

    test('getRegexPatternDownloadIdType rejects empty, too long and symbols', () => {
        const regex = new RegExp(patterns.getRegexPatternDownloadIdType());
        for (const value of ['', 'x'.repeat(51), 'abc-123', 'abc 123', 'abc_123']) {
            assert.equal(regex.test(value), false, value);
        }
    });

    test('getRegexPatternDownloadIdType exposes the "result" group', () => {
        const match = new RegExp(patterns.getRegexPatternDownloadIdType()).exec('build42');
        assert.equal(match.groups.result, 'build42');
    });

    test('patternNames lists every static pattern and each one compiles', () => {
        assert.equal(RegexPatterns.patternNames.length, 11);
        for (const name of RegexPatterns.patternNames) {
            assert.equal(typeof RegexPatterns[name], 'string', name);
            assert.doesNotThrow(() => new RegExp(RegexPatterns[name]), name);
        }
    });

    test('NejiUtils still exposes the same patterns for backward compatibility', () => {
        const NejiUtils = require('../lib/nejiutils.js');
        for (const name of RegexPatterns.patternNames) {
            assert.equal(NejiUtils[name], RegexPatterns[name], name);
        }
    });

    test('static patterns work directly', () => {
        assert.equal(new RegExp(RegexPatterns.RegexPatternValidIPV4Address).test('10.0.0.1'), true);
        assert.equal(new RegExp(RegexPatterns.RegexPatternValidIPV4Netmask).test('10.0.0.0/24'), true);
        assert.equal(new RegExp(RegexPatterns.RegexPatternValidHostname).test('example.com'), true);
    });

    test('getRegexPatternDownloadIdType2 extracts every release', () => {
        const html = '<a href="#">1.2.3 (Latest)</a><a href="#">1.2.2 (LTS)</a><a>skip me</a>';
        const releases = [...html.matchAll(patterns.getRegexPatternDownloadIdType2())].map((m) => m.groups.release);
        assert.deepEqual(releases, ['1.2.3', '1.2.2']);
    });
});
