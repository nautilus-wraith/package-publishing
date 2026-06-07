const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hello } = require('./index');

test('hello returns default greeting', () => {
  assert.equal(hello(), 'Hello, World!');
});

test('hello returns named greeting', () => {
  assert.equal(hello('NPM'), 'Hello, NPM!');
});
