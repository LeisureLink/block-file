# block-file [![Circle CI](https://circleci.com/gh/LeisureLink/block-file.svg?style=svg)](https://circleci.com/gh/LeisureLink/block-file)

A block-read, buffered, random-access file implementation for nodejs.

## Why

When working with random-access files, access is often less than truly random. More often, reads occur around hot-spots in the file and writes tend to occur near recent reads. Think about database-style binary files; often a record is read, modified, and written back to the file. In such a case, block reads and a little bit of buffering can dramatically improve performance.

## Install

```bash
npm install block-file 
```

## Use

**es5**
```javascript
var BlockFile = require('block-file').BlockFile;
```

**es6**
```javascript
import { BlockFile } from 'block-file';
```

## License

[MIT](https://github.com/LeisureLink/block-file/blob/master/LICENSE)
