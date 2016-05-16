'use strict';

import assert from 'assert-plus';
import fs from 'fs';
import RandomAccessFile from 'ranfile';

import BlockManager from './block-manager';
import buf from './buf';

const $file = Symbol('file');
const $man = Symbol('man');

class BlockFile {

  constructor(file, blockSize, blockDepth, readAhead) {
    assert.object(file, 'file');
    assert.optionalNumber(blockSize, 'blockSize');
    assert.optionalNumber(blockDepth, 'blockDepth');
    assert.optionalNumber(readAhead, 'readAhead');
    this[$file] = file;
    this[$man] = new BlockManager($file, blockSize, blockDepth, readAhead);
  }

  get file() { this[$file]; }

  /*
   * Reads the specified number of bytes from the file beginning at the
   * specified offset.
   * @param {number} offset - the byte index of the first byte to read
   * @param {number} length = the number of bytes to read
   * @returns {Promise} a promise that upon success will be resolved with a Buffer containing the bytes read.
   */
  read(offset, length) {
    assert.number(offset, 'offset');
    assert.number(length, 'length');
    let mgr = this[$man];
    let first = mgr.blockId(offset);
    let count = (mgr.blockId(offset + length) + 1) - first;
    let blockOffset = mgr.blockRelativeOffset(offset);
    let res = buf.allocUnsafe(length);
    let remaining = length;
    let work = Promise.resolve();
    let i = -1;

    function copyBlockData(blockId) {
      return mgr.read(blockId)
        .then(block => {
          let from = (block.id === first) ? blockOffset : 0;
          let bytes = Math.min(remaining, (mgr.blockSize - from));
          remaining -= block.buffer.copy(res, res.length - remaining, from, bytes);
        });
    }
    while (++i < count) {
      work = work.then(copyBlockData.bind(null, first + i));
    }
    return work.then(() => res);
  }

  /*
   * Writes the specified bytes to the file beginning at the specified offset.
   * @param {number} offset - the byte index where writing will begin
   * @param {Buffer} data - the bytes to be written to the file
   * @param {number} first - (optional) the first byte to write from the data buffer
   * @param {number} length - (optional) the number of bytes to write from the buffer
   * @returns {Promise} a promise that upon success will be resolved with the index of the byte following the last byte written (convenient for successive writes)
   */
  write(offset, data, start, length) {
    assert.number(offset, 'offset');
    assert.ok(Buffer.isBuffer(data), 'data (Buffer) is required');
    assert.optionalNumber(start, 'start');
    assert.optionalNumber(length, 'length');
    start = (start !== undefined) ? start : 0;
    length = (length !== undefined) ? length : data.length;

    let file = this[$file];
    let mgr = this[$man];
    let writeUntilOffset = offset + length;

    function writeThroughBlocks(blockId, offset) {
      return mgr.read(blockId)
        .then(block => block.write(file, offset, data, writeUntilOffset - offset))
        .then(offset => {
          if (offset < writeUntilOffset) {
            return writeThroughBlocks(blockId + 1, offset);
          }
          return offset;
        });
    }
    return writeThroughBlocks(mgr.blockId(offset), offset);
  }

}

function open(options) {
  assert.object(options, 'options');
  assert.string(options.path, 'options.path');
  assert.optionalNumber(options.blockSize, 'options.blockSize');
  assert.optionalNumber(options.bufferDepth, 'options.bufferDepth');
  assert.optionalNumber(options.readAheadDepth, 'options.readAheadDepth');
  assert.optionalBool(options.writable, 'options.writable');
  let mode = fs.R_OK;
  if (options.writable) {
    mode |= fs.W_OK;
  }
  return RandomAccessFile.open(options.path, options.writable)
    .then(file => new BlockFile(file, options.blockSize, options.bufferDepth, options.readAheadDepth));
}

function create(options) {
  assert.object(options, 'options');
  assert.string(options.path, 'options.path');
  assert.optionalNumber(options.blockSize, 'options.blockSize');
  assert.optionalNumber(options.bufferDepth, 'options.bufferDepth');
  assert.optionalNumber(options.readAheadDepth, 'options.readAheadDepth');
  return RandomAccessFile.create(options.path)
    .then(file => new BlockFile(file, options.blockSize, options.bufferDepth, options.readAheadDepth));
}

function openOrCreate(options) {
  return BlockFile.open(options)
    .catch(err => {
      // if it doesn't exist we'll create it if writable
      if (err.code === 'ENOENT' && options.writable) {
        return BlockFile.create(options);
      }
      throw err;
    });
}

BlockFile.create = create;
BlockFile.open = open;
BlockFile.openOrCreate = openOrCreate;

BlockFile.DEFA_BLOCK_SIZE = BlockManager.DEFA_BLOCK_SIZE;
BlockFile.DEFA_BLOCK_DEPTH = BlockManager.DEFA_BLOCK_DEPTH;
BlockFile.DEFA_READAHEAD_DEPTH = BlockManager.DEFA_READAHEAD_DEPTH;

export default BlockFile;
