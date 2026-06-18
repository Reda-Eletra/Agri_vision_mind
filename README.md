# Agricultural Vision Mind

Agricultural Vision Mind is a graduation-project smart agriculture platform with a React/Vite frontend and an Express/PostgreSQL backend. It focuses on plant diagnosis, growth guidance, farm management, tracking, community posts, news, analytics, finance, satellite NDVI insights, admin tools, and authentication.

## Available Features

- Plant Doctor image diagnosis using Gemini when a Gemini API key is configured.
- Growth Guide generated through Gemini.
- Farm management with coordinates, crop cycles, tasks, and cycle-based plant scans.
- Standalone tracked plants and diagnosis history.
- Dashboard analytics, weather-driven disease risk, finance, and satellite NDVI views.
- Community posts, comments, likes, and moderation through admin routes.
- News listing and admin news sync/create/delete.
- Local/register login, JWT auth, profile updates, password/email updates, and optional Google OAuth.
- Demo/offline mode when backend auth is disabled.

## Installation

```bash
npm install
npm run backend:install
```

## Frontend Environment

Create `.env.local` from `.env.example`.

```env
VITE_API_BASE_URL=/api
VITE_BACKEND_ORIGIN=http://localhost:4000
VITE_USE_BACKEND_AUTH=true
VITE_GEMINI_API_KEY=
VITE_OPENWEATHER_API_KEY=
VITE_AGRO_API_BASE=https://api.agromonitoring.com
VITE_AGRO_API_KEY=
```

`VITE_GEMINI_API_KEY` is required for frontend Gemini features unless users add a local key from the profile modal. For production, move Gemini calls behind the backend.

## Backend Environment

Create `back_end SmartAgri_project/back_end SmartAgri_project/.env` from that folder's `.env.example`.

Important variables:

```env
PORT=4000
NODE_ENV=development
DB_MODE=auto
JWT_SECRET=change_this_to_a_strong_secret
FRONTEND_URL=http://localhost:5173
NEWS_SYNC_ENABLED=true
GEMINI_API_KEY=
ADMIN_EMAILS=admin@example.com
```

Use `DB_MODE=memory` for quick demos without PostgreSQL. Use `DB_MODE=postgres` for real persistence.

## Run Commands

Frontend:

```bash
npm run dev
```

Backend:

```bash
npm run backend:dev
```

Production build:

```bash
npm run build
npm run preview
```

Backend health check:

```bash
curl http://localhost:4000/health
```

## Database Setup

For a quick nonpersistent demo, set `DB_MODE=memory`. For PostgreSQL, create an empty database, configure the backend `.env`, and run the versioned migrations:

```bash
cd "back_end SmartAgri_project/back_end SmartAgri_project"
npm run db:migrate
npm run db:migrate:status
```

Starting the backend also runs pending migrations before the HTTP port is opened. Existing installations using the previous schema are detected and upgraded without dropping user data. Do not apply `config/schema.sql` manually to an existing database; it is a schema reference and baseline source, not the upgrade mechanism.

If a migration fails, the migration transaction is rolled back and server startup stops. Correct the database/configuration problem, leave the failed migration file unchanged, and rerun `npm run db:migrate`. Never mark a failed migration applied by hand.

## Tests

```bash
npm test
npm run test:backend
npm run test:all
```

Backend tests force `DB_MODE=memory`, isolate uploaded files in a temporary directory, and do not start schedulers or call external providers.

## Demo Mode

Set `VITE_USE_BACKEND_AUTH=false` to use local mock data. Demo mode is useful for UI review only. Do not use mock login/admin behavior in production.

## Production Notes

- Set strong `JWT_SECRET` and `SESSION_SECRET`.
- Use PostgreSQL instead of `pg-mem`.
- Configure real `FRONTEND_URL` and strict CORS origins.
- Keep uploaded files outside source control.
- Disable Swagger in production; the server now only exposes it outside production.
- Review remaining backend dependency upgrades before deployment: `nodemailer` and `uuid` require major-version testing.
