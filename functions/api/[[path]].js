import { httpServerHandler } from 'cloudflare:node';
import app from '../../server/index.js';

let handler;

export const onRequest = (context) => {
  // Pass the Cloudflare env to globalThis so our D1 compatibility layer can access it.
  globalThis.CLOUDFLARE_CONTEXT = context;
  globalThis.MINIFLARE_ENV = context.env;

  if (!handler) {
    handler = httpServerHandler(app);
  }

  return handler(context.request, context.env, context);
};
