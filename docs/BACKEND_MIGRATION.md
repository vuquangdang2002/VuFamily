# Backend Migration to Hono & Cloudflare Workers

The backend of the `VuFamily` application has been successfully migrated from a traditional Node.js/Express architecture to a modern, edge-optimized stack using Hono, Drizzle ORM, and Cloudflare Workers (with D1 Database).

## Key Architectural Changes

### 1. Framework: Express ➔ Hono
- The legacy `express` framework and its middleware ecosystem (`cors`, `morgan`, `body-parser`) have been removed.
- Replaced by `Hono` (`api/src/index.ts`), which natively supports Web Standard `Request` and `Response` interfaces, making it blazing fast on Cloudflare Workers.

### 2. Database: Supabase/Postgres ➔ Cloudflare D1 (SQLite)
- Legacy PostgreSQL models via `@supabase/supabase-js` were dropped.
- Implemented `Drizzle ORM` to strictly type database queries against our new Cloudflare D1 SQLite database.
- Schema definitions are centrally located in `api/src/db/schema.ts`.

### 3. File Structure
- `server/` (Obsolete): Deleted. Included all old controllers, models, and express routes.
- `api/src/modules/`: Contains the new Hono routers handling modular domains (`auth.ts`, `users.ts`, `members.ts`, `posts.ts`, `events.ts`, `finance.ts`, `chat.ts`).
- `api/src/db/`: Contains Drizzle database connection logic and schema.
- `api/src/utils/`: Contains utility functions (like `crypto.ts` utilizing `node:crypto`).

### 4. Dependencies
- Cleaned up obsolete dependencies from `package.json` (Express, pg, socket.io, etc.).
- `nodejs_compat` flag enabled in `wrangler.toml` to support `node:crypto`.

## Local Development
To run the full stack locally:
```bash
npm run dev
```
This concurrently starts `wrangler dev` (Backend API on `localhost:8787`) and Vite (Frontend React app).
