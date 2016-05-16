'use strict';

const assert = require('assert');
const test = require('tape');

const buf = require('../').buf;
const Block = require('../').Block;

function catcher(work, fail) {
  try {
    work();
    throw new Error('should have failed');
  } catch (err) {
    fail(err);
  }
}

test('.ctor errors when called as fn', t => {
  // behavior put in place by babel's transpiler
  t.throws(() => Block(),
    'TypeError: Cannot call class as function',
    'TypeError: Cannot call class as function');
  t.end();
});

test('.ctor() fails when no offset specified', t => {
  catcher(() => new Block(),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'offset (number) is required', 'offset (number) is required');
      t.end();
    });
});

test('.ctor() fails when offset specified with wrong type', t => {
  catcher(() => new Block({}),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'offset (number) is required', 'offset (number) is required');
      t.end();
    });
});

test('.ctor() fails when no buffer specified', t => {
  catcher(() => new Block(0),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'buffer (Buffer) is required', 'buffer (Buffer) is required');
      t.end();
    });
});

test('.ctor() fails when buffer specified wrong type', t => {
  catcher(() => new Block(0, 100),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'buffer (Buffer) is required', 'buffer (Buffer) is required');
      t.end();
    });
});

test('.ctor() succeeds when offset and buffer are specified', t => {
  t.doesNotThrow(() => {
    let buffer = buf.alloc(100);
    let block = new Block(0, buffer, buffer.length);
    t.equal(block.offset, 0, 'offset is as expected');
    t.equal(block.buffer, buffer, 'buffer is as expected');
    t.equal(block.length, buffer.length, 'length is taken from buffer');
    t.notOk(block.dirty, 'newly create buffer should be clean');
    t.end();
  });
});

test('.read() fails when offset not specified', t => {
  let buffer = buf.alloc(100);
  let block = new Block(0, buffer, buffer.length);
  catcher(() => block.read(),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'offset (number) is required', 'offset (number) is required');
      t.end();
    });
});

test('.read() fails when offset specified wrong type', t => {
  let buffer = buf.alloc(100);
  let block = new Block(0, buffer, buffer.length);
  catcher(() => block.read(buffer),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'offset (number) is required', 'offset (number) is required');
      t.end();
    });
});

test('.read() fails when length not specified', t => {
  let buffer = buf.alloc(100);
  let block = new Block(0, buffer, buffer.length);
  catcher(() => block.read(0),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'length (number) is required', 'length (number) is required');
      t.end();
    });
});

test('.read() fails when length specified wrong type', t => {
  let buffer = buf.alloc(100);
  let block = new Block(0, buffer, buffer.length);
  catcher(() => block.read(0, buffer),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'length (number) is required', 'length (number) is required');
      t.end();
    });
});

test('.read() fails when offset out of range (<)', t => {
  let buffer = buf.alloc(100);
  let block = new Block(100, buffer, buffer.length);
  catcher(() => block.read(0, 20),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'offset out of block range (<)', 'offset out of block range (<)');
      t.end();
    });
});

test('.read() fails when offset out of range', t => {
  let buffer = buf.alloc(100);
  let block = new Block(100, buffer, buffer.length);
  catcher(() => block.read(200, 20),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'offset out of block range (>)', 'offset out of block range (>)');
      t.end();
    });
});

test('.read() succeeds when offset and length are specified (start of buffer)', t => {
  t.doesNotThrow(() => {
    let buffer = buf.allocUnsafe(100);
    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = i;
    }
    let block = new Block(0, buffer, buffer.length);
    let data = block.read(0, 20);
    for (let i = 0; i < data.length; ++i) {
      t.equal(data[i], i, `${i}th octet has value ${i}`);
    }
    t.equal(data.length, 20, 'data length is requested length');
    t.notOk(block.dirty, 'buffer should be clean');
    t.end();
  });
});

test('.read() succeeds when offset and length are specified (end of buffer)', t => {
  t.doesNotThrow(() => {
    let buffer = buf.allocUnsafe(100);
    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = i;
    }
    let block = new Block(0, buffer, buffer.length);
    let data = block.read(80, 20);
    for (let i = 0; i < data.length; ++i) {
      t.equal(data[i], 80 + i, `${i}th octet has value ${80+i}`);
    }
    t.equal(data.length, 20, 'data length is requested length');
    t.notOk(block.dirty, 'buffer should be clean');
    t.end();
  });
});

test('.read() succeeds when offset and length are specified to read beyond end of buffer', t => {
  t.doesNotThrow(() => {
    let buffer = buf.allocUnsafe(100);
    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = i;
    }
    let block = new Block(0, buffer, buffer.length);
    let data = block.read(90, 20);
    for (let i = 0; i < data.length; ++i) {
      t.equal(data[i], 90 + i, `${i}th octet has value ${90+i}`);
    }
    t.equal(data.length, 10, 'data length is number of bytes remaining after offset');
    t.notOk(block.dirty, 'buffer should be clean');
    t.end();
  });
});

test('.write() fails when offset not specified', t => {
  let buffer = buf.alloc(100);
  let block = new Block(0, buffer, buffer.length);
  catcher(() => block.write(),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'offset (number) is required', 'offset (number) is required');
      t.end();
    });
});

test('.write() fails when offset specified of wrong type', t => {
  let buffer = buf.alloc(100);
  let block = new Block(0, buffer, buffer.length);
  catcher(() => block.write({}),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'offset (number) is required', 'offset (number) is required');
      t.end();
    });
});

test('.write() fails when data not specified', t => {
  let buffer = buf.alloc(100);
  let block = new Block(0, buffer, buffer.length);
  catcher(() => block.write(0),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'data (Buffer) is required', 'data (Buffer) is required');
      t.end();
    });
});

test('.write() fails when data specified with wrong type', t => {
  let buffer = buf.alloc(100);
  let block = new Block(0, buffer, buffer.length);
  catcher(() => block.write(0, {}),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'data (Buffer) is required', 'data (Buffer) is required');
      t.end();
    });
});

test('.write() fails when offset out of range (<)', t => {
  let buffer = buf.alloc(100);
  let block = new Block(100, buffer, buffer.length);
  catcher(() => block.write(0, buffer),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'offset out of block range (<)', 'offset out of block range (<)');
      t.end();
    });
});

test('.write() fails when offset out of range (>)', t => {
  let buffer = buf.alloc(100);
  let block = new Block(0, buffer, buffer.length);
  catcher(() => block.write(200, buffer),
    e => {
      t.ok(e instanceof assert.AssertionError, 'Error is an AssertionError');
      t.equal(e.message, 'offset out of block range (>)', 'offset out of block range (>)');
      t.end();
    });
});

test('.write() succeeds when offset and data are specified (start of buffer)', t => {
  t.doesNotThrow(() => {
    let buffer = buf.allocUnsafe(100);
    let data = buf.allocUnsafe(10);
    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = i;
    }
    for (let i = data.length; i > 0; --i) {
      data[data.length - i] = i;
    }
    let block = new Block(0, buffer, buffer.length);
    let bytes = block.write(0, data);
    t.equal(bytes, data.length, `number of bytes written is ${data.length}`);
    for (let i = 0; i < bytes; ++i) {
      t.equal(buffer[i], data[i], `${i}th octet has value ${data[i]}`);
    }
    t.equal(block.dirty, bytes, 'buffer should be dirty');
    t.end();
  });
});

test('.write() succeeds when offset and data are specified to write beyond end of buffer', t => {
  t.doesNotThrow(() => {
    let buffer = buf.allocUnsafe(100);
    let data = buf.allocUnsafe(20);
    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = i;
    }
    for (let i = data.length; i > 0; --i) {
      data[data.length - i] = i;
    }
    let block = new Block(0, buffer, buffer.length);
    let bytes = block.write(90, data);
    t.equal(bytes, 10, 'number of bytes written is 10');
    for (let i = 0; i < bytes; ++i) {
      t.equal(buffer[90 + i], data[i], `${90+i}th octet has value ${data[i]}`);
    }
    t.equal(block.dirty, bytes, 'buffer should be dirty');
    t.end();
  });
});

test('.write() succeeds when writing to an undersized buffer', t => {
  t.doesNotThrow(() => {
    let buffer = buf.allocUnsafe(10);
    let data = buf.allocUnsafe(20);
    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = i;
    }
    for (let i = data.length; i > 0; --i) {
      data[data.length - i] = i;
    }
    // Note, because the buffer is undersized, it will be copied to a buffer of
    // block-size.
    let block = new Block(0, buffer, 100);
    t.equal(block.length, buffer.length, 'block.length is buffer.length');
    let bytes = block.write(0, data);
    t.equal(bytes, data.length, `number of bytes written is ${data.length}`);
    t.equal(block.length, data.length, 'block.length has extended to accomodate the bytes');
    for (let i = 0; i < bytes; ++i) {
      t.equal(block.buffer[i], data[i], `${i}th octet has value ${data[i]}`);
    }
    t.equal(block.dirty, bytes, 'buffer should be dirty');
    t.end();
  });
});

test('.write() undersized buffer only grows to block-size', t => {
  t.doesNotThrow(() => {
    let buffer = buf.allocUnsafe(90);
    let data = buf.allocUnsafe(20);
    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = i;
    }
    for (let i = data.length; i > 0; --i) {
      data[data.length - i] = i;
    }
    // Note, because the buffer is undersized, it will be copied to a buffer of
    // block-size.
    let block = new Block(0, buffer, 100);
    t.equal(block.length, buffer.length, 'block.length is buffer.length');
    let bytes = block.write(90, data);
    t.equal(bytes, 10, 'number of bytes written is 10');
    t.equal(block.length, block.blockSize, 'block.length has extended to the block-size');
    for (let i = 0; i < bytes; ++i) {
      t.equal(block.buffer[90+i], data[i], `${i}th octet has value ${data[i]}`);
    }
    t.equal(block.dirty, bytes, 'buffer should be dirty');
    t.end();
  });
});
