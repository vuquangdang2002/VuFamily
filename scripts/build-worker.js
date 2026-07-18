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
  minify: false,
  sourcemap: true,
}).then(() => {
  console.log('⚡ Worker compiled successfully with iconv-lite and dotenv mocked!');
}).catch((err) => {
  console.error('❌ Compilation failed:', err);
  process.exit(1);
});
