'use strict';

const stream = require('stream'),
      crypto = require('crypto');

const test = require('tap').test;

const { EncryptStream, DecryptStream } = require('./');

class StreamBuffer extends stream.Writable {
  constructor() {
    super();
    this.chunks = [];
  }

  _write(chunk, encoding, callback) {
    this.chunks.push(chunk);
    callback();
  }

  get result() {
    return Buffer.concat(this.chunks);
  }
}

function testPipe(inputStream, transformStream) {
  return new Promise((resolve, reject) => {
    const streamBuffer = new StreamBuffer();
    inputStream.pipe(transformStream)
      .pipe(streamBuffer);

    streamBuffer.once('error', e => {
      reject(e);
    });

    streamBuffer.once('finish', () => {
      resolve(streamBuffer.result);
    });
  });
}

const TEST_CIPHERS = [
  { cipherName: 'aes-128-cbc', keyLength: 16 },
  { cipherName: 'aes-256-cbc', keyLength: 32 }
];

test('full decrypt', async function(t) {
  const dataLengths = [512, 1024, 4096, 7333, 13791];

  for (const { cipherName, keyLength } of TEST_CIPHERS) {
    for (const dataLength of dataLengths) {
      t.test(`${cipherName} len ${dataLength}` , async function(t) {
        const data = crypto.randomBytes(dataLength);
        const key = crypto.randomBytes(keyLength);

        const encrypted = await testPipe(
          stream.Readable.from(data),
          new EncryptStream({ key, cipherName })
        );
        t.equal(encrypted.length, EncryptStream.getEncryptedLength(dataLength));

        const decrypted = await testPipe(
          stream.Readable.from(encrypted),
          new DecryptStream({ key, cipherName, wantedOutputLength: dataLength })
        );

        t.equal(0, Buffer.compare(data, decrypted));
        t.end();
      });
    }
  }
});

test('partial decrypt', async function(t) {
  const dataRanges = [
    { dataLength: 512, start: 0, end: 511 },
    { dataLength: 917, start: 15, end: 912 },
    { dataLength: 1024, start: 139, end: 771 },
    { dataLength: 4096, start: 0, end: 4095 },
    { dataLength: 7777, start: 185, end: 911 },
  ];

  for (const { cipherName, keyLength } of TEST_CIPHERS) {
    for (const { dataLength, start, end } of dataRanges) {
      t.test(`${cipherName} len ${dataLength} start ${start} end ${end}`, async function(t) {
        const data = crypto.randomBytes(dataLength);
        const partialData = data.slice(start, end + 1);

        const key = crypto.randomBytes(keyLength);

        const encrypted = await testPipe(
          stream.Readable.from(data),
          new EncryptStream({ key, cipherName })
        );

        const { skipPrefixLength, encryptedStartIndex, encryptedEndIndex, wantedOutputLength } = DecryptStream.calculateParams({
          decryptedStartIndex: start,
          decryptedEndIndex: end
        });

        const partialEncrypted = encrypted.slice(encryptedStartIndex, encryptedEndIndex + 1);

        const partialDecrypted = await testPipe(
          stream.Readable.from(partialEncrypted),
          new DecryptStream({ key, cipherName, skipPrefixLength, wantedOutputLength })
        );

        t.equal(0, Buffer.compare(partialData, partialDecrypted));
        t.end();
      });
    }
  }
});
