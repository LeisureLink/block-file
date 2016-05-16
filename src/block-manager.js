'use strict';

import assert from 'assert-plus';
import btree from 'btreejs';
import Block from './block';

const DEFA_BLOCK_SIZE = (1 << 12) - 1; // 8k
const DEFA_BLOCK_DEPTH = 64;
const DEFA_READAHEAD_DEPTH = 4;

const $file = Symbol('file');
const $blockSize = Symbol('blockSize');
const $blockDepth = Symbol('blockDepth');
const $readAhead = Symbol('readAhead');
const $blocks = Symbol('blocks');
const $head = Symbol('head');
const $data = Symbol('data');
const $mru = Symbol('mru');

/**
 * Manages block reads and writes on top of a random-access file.
 */
class BlockManager {

  /**
   * Creates a new instance.
   *
   * @param {number} file - A random access file which will serve as the source and destination of blocks.
   * @param {number} blockSize - The number of bytes in each block. A good size would match the block size of the underlying storage device. Defaults to 8k.
   * @param {number} blockDepth - The number of most-recently-used blocks kept in memory for reuse. Defaults to 64 (sixty-four).
   * @param {number} readAhead - The number of blocks to read-ahead. Defaults to 4 (four).
   */
  constructor(file, blockSize, blockDepth, readAhead) {
    assert.object(file, 'file');
    assert.optionalNumber(blockSize, 'blockSize');
    assert.optionalNumber(blockDepth, 'blockDepth');
    assert.optionalNumber(readAhead, 'readAhead');
    blockSize = Math.floor(blockSize || DEFA_BLOCK_SIZE);
    blockDepth = Math.floor(blockDepth || DEFA_BLOCK_DEPTH);
    readAhead = Math.floor(readAhead || DEFA_READAHEAD_DEPTH);
    assert.ok(blockSize > 0, 'blockSize must be greater than zero');
    assert.ok(blockDepth > 0, 'blockDepth must be greater than zero');
    assert.ok(readAhead >= 0, 'readAhead must be zero or more');
    assert.ok(readAhead < blockDepth, 'readAhead must be less than blockDepth');
    this[$file] = file;
    this[$blockSize] = blockSize;
    this[$blockDepth] = blockDepth;
    this[$readAhead] = readAhead;
    this[$blocks] = [];
    this[$head] = -1;
    let Tree = btree.create(2, btree.numcmp);
    this[$data] = new Tree();
  }

  /**
   * @type {number} Number of bytes in each block.
   */
  get blockSize() {
    return this[$blockSize];
  }

  /**
   * @type {number} Number of most-recently-used blocks to keep in memory for reuse.
   */
  get blockDepth() {
    return this[$blockDepth];
  }

  /**
   * @type {number} Number of blocks to read-ahead.
   */
  get readAheadDepth() {
    return this[$readAhead];
  }

  /**
   * @type {number} Number of blocks available in the file.
   */
  get count() {
    return this[$file].size / this.blockSize;
  }

  /**
   * Calculates the BlockID where the specified `offset` resides.
   * @param {number} offset - A zero-based byte offset.
   * @returns {number} A zero-based block identifier.
   */
  blockId(offset) {
    return Math.ceil(offset / this.blockSize) - 1;
  }

  /**
   * Translates an offset to a block relative offset.
   * @param {number} offset - A zero-based byte offset relative to the entire file.
   * @returns {number} A zero-based byte offset relative to the block where the offset resides.
   */
  blockRelativeOffset(offset) {
    return offset % this.blockSize;
  }

  read(blockId) {
    if (this[$mru] && this[$mru].id === blockId) {
      return Promise.resolve(this[$mru]);
    }
    let slot = this[$data].get(blockId);
    if (slot !== undefined) {
      let offset = blockId * this.blockSize;
      this[$file].read(offset, this.blockSize)
        .then(buffer => {
          let head = (this[$head] + 1) % this.blockDepth;
          let block = this[$mru] = new Block(offset, buffer);
          let evicted = this[$blocks][head];
          this[$blocks][head] = block;
          if (evicted) {
            this[$data].del(evicted);
          }
          this[$data].put(blockId, head);
          return block;
        });
    }
    this[$mru] = this[$blocks][slot];
    return Promise.resolve(this[$mru]);
  }

}

BlockManager.DEFA_BLOCK_SIZE = DEFA_BLOCK_SIZE;
BlockManager.DEFA_BLOCK_DEPTH = DEFA_BLOCK_DEPTH;
BlockManager.DEFA_READAHEAD_DEPTH = DEFA_READAHEAD_DEPTH;

export default BlockManager;
