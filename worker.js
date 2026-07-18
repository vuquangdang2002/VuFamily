// Shim global require for CommonJS modules bundled by ESBuild running on Cloudflare Workers
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

const shimModules = {
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

globalThis.require = (id) => {
  if (shimModules[id]) {
    return shimModules[id];
  }
  throw new Error(`Dynamic require of "${id}" is not supported in Cloudflare Workers`);
};

import { httpServerHandler } from 'cloudflare:node';
import app from './server/index.js';

let handler;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Bind the Cloudflare env & context to global scope for D1/R2 compatibility
    globalThis.MINIFLARE_ENV = env;
    globalThis.CLOUDFLARE_CONTEXT = ctx;
    
    if (url.pathname.startsWith('/api/')) {
      if (!handler) {
        handler = httpServerHandler(app);
      }
      return handler(request, env, ctx);
    }
    
    // Serve static frontend assets from client/dist
    return env.ASSETS.fetch(request);
  }
};
