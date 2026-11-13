'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('index exports every class as a constructor', () => {
    const lib = require('../index.js');
    assert.deepEqual(Object.keys(lib).sort(), ['Logger', 'MessageBroker', 'NejiUtils', 'RegexPatterns']);
    for (const [name, value] of Object.entries(lib)) {
        assert.equal(typeof value, 'function', name);
        assert.equal(value.name, name);
    }
});

test('NejiUtils and MessageBroker construct without side effects', (t) => {
    const log = t.mock.method(console, 'log', () => {});
    const {NejiUtils, MessageBroker} = require('../index.js');
    new NejiUtils({a: 1});
    new MessageBroker();
    assert.equal(log.mock.callCount(), 0);
});

test('every dependency in package.json resolves', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    for (const dep of Object.keys(pkg.dependencies)) {
        assert.doesNotThrow(() => require.resolve(dep), dep);
    }
});
