const { StringDecoder } = require('string_decoder');

function getDecoder(encoding) {
  let enc = encoding.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (enc === 'utf8' || enc === 'utf') enc = 'utf-8';
  
  const decoder = new StringDecoder(enc);
  return {
    write(buf) {
      return decoder.write(buf);
    },
    end() {
      return decoder.end();
    }
  };
}

function encodingExists(encoding) {
  const enc = encoding.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['utf8', 'utf', 'ascii', 'utf16le', 'ucs2', 'base64', 'latin1', 'hex'].includes(enc);
}

module.exports = {
  getDecoder,
  encodingExists
};
