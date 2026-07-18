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
