'use strict';

let alloc = Buffer.alloc;
if (!alloc) {
  alloc = function alloc(size, fill, encoding) {
    let res = new Buffer(size, fill, encoding);
    res.fill((typeof(fill) === 'number') ? fill : 0);
    res.encoding = encoding || 'utf8';
    return res;
  };
}

let allocUnsafe = Buffer.allocUnsafe;
if (!allocUnsafe) {
  allocUnsafe = function allocUnsafe(size) {
    return new Buffer(size);
  };
}

export default { alloc, allocUnsafe };
