import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './backend/src/db/schema.ts',
  out: './backend/src/db/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
});
