'use strict';

const test = require('tape');
const tmp = require('tmp');
const BlockFile = require('../').BlockFile;

tmp.setGracefulCleanup();

test('.ctor errors when called as fn', t => {
  // behavior put in place by babel's transpiler
  t.throws(() => {
    BlockFile();
  },
  'TypeError: Cannot call class as function',
  'TypeError: Cannot call class as function');
  t.end();
});

test('BlockFile.create() fails without options', t => {
  t.throws(() => BlockFile.create(), 'AssertionError: options (object) is required');
  t.end();
});

test('BlockFile.create({}) fails without path', t => {
  t.throws(() => BlockFile.create({}), 'AssertionError: options.path (string) is required');
  t.end();
});

test('BlockFile.create({ path: 1 }) fails when path wrong type', t => {
  t.throws(() => BlockFile.create({ path: 1 }), 'AssertionError: options.path (string) is required');
  t.end();
});

