import { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const successResponse = (c: Context, data: any = null, message?: string, status: ContentfulStatusCode = 200) => {
  return c.json({
    success: true,
    data,
    ...(message ? { message } : {})
  }, status);
};

export const errorResponse = (c: Context, error: string, status: ContentfulStatusCode = 400) => {
  return c.json({
    success: false,
    error
  }, status);
};
