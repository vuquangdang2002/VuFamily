import { httpServerHandler } from 'cloudflare:node';
import app from './server/index.js';

// Setup Cloudflare's native httpServerHandler to bridge Express and fetch
const port = 8080;
app.listen(port);

const nodeHandler = httpServerHandler({
  port: port, // Internal mock port
  fetch: app  // The Express app instance
});

export default {
  async fetch(request, env, ctx) {
    globalThis.MINIFLARE_ENV = env;
    globalThis.CLOUDFLARE_CONTEXT = ctx;
    
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/uploads/')) {
       if (typeof nodeHandler === 'function') {
         return nodeHandler(request, env, ctx);
       } else if (nodeHandler && typeof nodeHandler.fetch === 'function') {
         return nodeHandler.fetch(request, env, ctx);
       }
    }
    
    return env.ASSETS.fetch(request);
  }
};
