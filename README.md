# aes-cbc-stream

nodejs module for AES-CBC stream encryption and decryption, with support for partial decrypts.

# Installation

`npm install aes-cbc-stream`

# Examples

### Encrypt a file

```
const fs = require('fs'),
      crypto = require('crypto');
      
const { EncryptStream } = require('aes-cbc-stream')

// Encrypt `data.bin`.
const inputStream = fs.createReadStream('data.bin');
const outputStream = fs.createWriteStream('encrypted.bin');

const encryptKey = crypto.randomBytes(32);
inputStream
    .pipe(new EncryptStream({
      key: encryptKey,
      cipherName: 'aes-256-cbc'
    }))
    .pipe(outputStream);
    
outputStream.on('finish', function() {
   console.log("File encrypted!");
});
```

### Partially decrypt a file

```
const fs = require('fs'),
      crypto = require('crypto');

// The desired range (inclusive) of decrypted data.
const start = 100, end = 300;

// Find the parameters to pass to DecryptStream with calculateParams().
const {
    skipPrefixLength,
    encryptedStartIndex,
    encryptedEndIndex,
    wantedOutputLength
} = DecryptStream.calculateParams({
    decryptedStartIndex: start,
    decryptedEndIndex: end
});

const inputStream = fs.createReadStream('encrypted.bin');
const outputStream = fs.createWriteStream('decrypted.bin');

const decryptStream = new DecryptStream({
    // The key and cipher used to encrypt the file from the previous example.
    key: encryptKey,
    cipherName: 'aes-256-cbc',
        
    // Start and end index at block boundaries, with a preceding IV block.
    encryptedStartIndex,
    encryptedEndIndex,

    // The number of initial decrypted bytes to skip. If `start` does not
    // start at a block boundary, this is a non-zero number in order to
    // return the requested range.
    skipPrefixLength,
    
    // The desired output length.
    wantedOutputLength
});

inputStream.pipe(decryptStream)
           .pipe(outputStream);
           
outputStream.on('finish', () => {
   console.log("Decryption done!");
});
```
