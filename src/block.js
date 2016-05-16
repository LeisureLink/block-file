'use strict';

import assert from 'assert-plus';
import buf from './buf';

const $file = Symbol('file');
const $offset = Symbol('offset');
const $buffer = Symbol('buffer');
const $length = Symbol('length');
const $size = Symbol('size');

class Block {

  constructor(file, offset, size) {
    assert.object(file, 'file');
    assert.number(offset, 'offset');
    assert.number(size, 'size');
    this[$file] = file;
    this[$offset] = offset;
    this[$size] = size;
    this[$length] = Math.min(size, file.size - offset);
  }

  get id() {
    return Math.ceil(this.offset / this.bytesUsed) - 1;
  }

  get offset() {
    return this[$offset];
  }

  get size() {
    return this[$size];
  }

  get bytesUsed() {
    return this[$length];
  }

  loadBuffer() {
    let res = this[$buffer];
    if (res) {
      return (Buffer.isBuffer(res)) ? Promise.resolve(res) : res;
    }
    return this[$buffer] = this[$file].read(this.offset, this.bytesUsed)
      .then(buffer => {
        if (this.size === buffer.length) {
          this[$buffer] = buffer;
        } else {
          let block = buf.allocUnsafe(this.size);
          buffer.copy(block, 0, 0, buffer.length);
          this[$buffer] = buffer = block;
        }
        return buffer;
      });
  }

  read(offset, length) {
    assert.number(offset, 'offset');
    assert.number(length, 'length');
    assert.ok(offset >= this.offset, 'offset out of block range (<)');
    assert.ok(offset < this.offset + this.bytesUsed, 'offset out of block range (>)');
    offset -= this.offset;
    length = Math.min(length, this.bytesUsed - offset);
    this.loadBuffer().then(buffer => buffer.slice(offset, offset + length));
  }

  write(offset, data, first, length) {
    assert.number(offset, 'offset');
    assert.ok(Buffer.isBuffer(data), 'data (Buffer) is required');
    assert.optionalNumber(first, 'first');
    assert.optionalNumber(length, 'length');
    assert.ok(offset >= this.offset, 'offset out of block range (<)');
    if (this.bytesUsed < this.size) {
      assert.ok(offset <= this.offset + this.bytesUsed, 'offset out of block range (>)');
    } else {
      assert.ok(offset < this.offset + this.bytesUsed, 'offset out of block range (>)');
    }
    first = (first !== undefined) ? first : 0;
    offset -= this.offset;
    length = Math.min((length !== undefined) ? length : data.length, this.size - offset);
    this.loadBuffer().then(buffer => {
      let bytes = data.copy(buffer, offset, first, length);
      if (this[$length] < offset + bytes) {
        this[$length] = offset + bytes;
      }
      if (bytes) {
        return this[$file].write(this.offset + offset, buffer, offset, bytes);
      }
      return Promise.resolve(this.offset);
    });

  }

}

export default Block;
