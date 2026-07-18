const esbuild = require('esbuild');
const path = require('path');

const mockIconvPlugin = {
  name: 'mock-iconv-lite',
  setup(build) {
    build.onResolve({ filter: /^iconv-lite$/ }, args => {
      return { path: path.resolve(__dirname, './mock-iconv-lite.js') };
    });
    build.onResolve({ filter: /^dotenv$/ }, args => {
      return { path: path.resolve(__dirname, './mock-dotenv.js') };
    });
  }
};

const bannerJs = `
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { versions: { node: '18.0.0' }, version: 'v18.0.0', env: {} };
} else {
  if (!globalThis.process.versions) globalThis.process.versions = {};
  if (!globalThis.process.versions.node) globalThis.process.versions.node = '18.0.0';
  if (!globalThis.process.version) globalThis.process.version = 'v18.0.0';
}

import nodeHttp from 'node:http';
import nodePath from 'node:path';
import nodeCrypto from 'node:crypto';
import nodeEvents from 'node:events';
import nodeUtil from 'node:util';
import nodeStream from 'node:stream';
import nodeZlib from 'node:zlib';
import nodeUrl from 'node:url';
import nodeQuerystring from 'node:querystring';
import nodeTimers from 'node:timers';
import nodeBuffer from 'node:buffer';
import nodeStringDecoder from 'node:string_decoder';
import nodeNet from 'node:net';
import nodeTls from 'node:tls';
import nodeAssert from 'node:assert';
import nodeOs from 'node:os';

const mockFs = {
  readFileSync: () => { throw new Error('fs.readFileSync is not supported'); },
  writeFileSync: () => { throw new Error('fs.writeFileSync is not supported'); },
  existsSync: () => false,
  mkdirSync: () => {},
  promises: {
    readFile: async () => { throw new Error('fs.readFile is not supported'); },
    writeFile: async () => { throw new Error('fs.writeFile is not supported'); }
  }
};

const shimModules = {
  'fs': mockFs,
  'node:fs': mockFs,
  'http': nodeHttp,
  'path': nodePath,
  'crypto': nodeCrypto,
  'events': nodeEvents,
  'util': nodeUtil,
  'stream': nodeStream,
  'zlib': nodeZlib,
  'url': nodeUrl,
  'querystring': nodeQuerystring,
  'timers': nodeTimers,
  'buffer': nodeBuffer,
  'string_decoder': nodeStringDecoder,
  'net': nodeNet,
  'tls': nodeTls,
  'assert': nodeAssert,
  'os': nodeOs,
  'node:http': nodeHttp,
  'node:path': nodePath,
  'node:crypto': nodeCrypto,
  'node:events': nodeEvents,
  'node:util': nodeUtil,
  'node:stream': nodeStream,
  'node:zlib': nodeZlib,
  'node:url': nodeUrl,
  'node:querystring': nodeQuerystring,
  'node:timers': nodeTimers,
  'node:buffer': nodeBuffer,
  'node:string_decoder': nodeStringDecoder,
  'node:net': nodeNet,
  'node:tls': nodeTls,
  'node:assert': nodeAssert,
  'node:os': nodeOs
};

const require = (id) => {
  if (shimModules[id]) return shimModules[id];
  throw new Error("Dynamic require of " + id + " is not supported");
};
const __dirname = "/";
const __filename = "/index.js";
`;

esbuild.build({
  entryPoints: [path.resolve(__dirname, '../worker.js')],
  bundle: true,
  outfile: path.resolve(__dirname, '../dist-worker/index.js'),
  platform: 'browser', 
  format: 'esm',
  conditions: ['workerd', 'worker', 'browser'],
  external: [
    'cloudflare:node', 
    'cloudflare:sockets',
    'fs',
    'path',
    'crypto',
    'events',
    'util',
    'stream',
    'zlib',
    'http',
    'url',
    'querystring',
    'timers',
    'buffer',
    'string_decoder',
    'net',
    'tls',
    'assert',
    'os',
    'node:fs',
    'node:path',
    'node:crypto',
    'node:events',
    'node:util',
    'node:stream',
    'node:zlib',
    'node:http',
    'node:url',
    'node:querystring',
    'node:timers',
    'node:buffer',
    'node:string_decoder',
    'node:net',
    'node:tls',
    'node:assert',
    'node:os'
  ], 
  plugins: [mockIconvPlugin],
  banner: {
    js: bannerJs
  },
  minify: false,
  sourcemap: true,
}).then(() => {
  console.log('⚡ Worker compiled successfully with iconv-lite and dotenv mocked!');
}).catch((err) => {
  console.error('❌ Compilation failed:', err);
  process.exit(1);
});
