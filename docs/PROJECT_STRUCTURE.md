# Project Structure

GameTracker is split into a static React frontend and one Node/Express
backend. PostgreSQL is the only application database.

```text
game-tracker/
|- frontend/                 # React + Vite SPA, deployed to Vercel
|  |- src/
|  |- vite.config.ts         # /api and /health proxy to localhost:3001
|  |- vercel.json            # API rewrite and SPA fallback
|  |- package.json
|  `- .env.example           # No frontend secrets/configuration
|- backend/                  # Express API, deployed to Render
|  |- src/
|  |  |- server.ts           # API routes and startup
|  |  |- db.ts               # PostgreSQL pool, schema, data access
|  |  |- env.ts              # Load backend/.env before service imports
|  |  `- services/igdb.ts    # The only IGDB integration
|  |- .env.example
|  |- package.json
|  `- tsconfig.json
|- shared/
|  `- types.ts               # Shared domain types
|- docs/
`- render.yaml
```

## Runtime flow

```text
Browser -> React/Vite (local :3000) -> proxy -> Express (:3001)
Browser -> Vercel SPA -> /api rewrite -> Express on Render
Express -> PostgreSQL and IGDB/Twitch
```

Vercel forwards `/api/*` to Render and serves `index.html` for SPA routes. The
frontend makes relative API requests, so it does not need a public backend URL
or backend secrets. The session cookie stays associated with the frontend origin
through the rewrite.

## Shared code and ownership

- `frontend/src/` owns React UI and browser behavior.
- `backend/src/server.ts` owns Express routes and session/auth behavior.
- `backend/src/db.ts` owns PostgreSQL schema initialization and queries.
- `backend/src/services/igdb.ts` is the only service that calls Twitch/IGDB.
- `shared/types.ts` is imported by both applications; `frontend/src/types.ts`
  re-exports it for existing component imports.
- `backend/.env` is local service configuration; `backend/.env.example` lists
  required and optional variables. Secrets belong only on the backend.

## Development and deployment

Run `npm run dev` from the repository root to start both services. Use
`npm run build` and `npm run lint` at the root to validate both projects.

Render builds and starts the backend from `backend/` using `render.yaml`.
Vercel's project root is `frontend/`; it builds the static SPA. See
[`DEPLOYMENT.md`](./DEPLOYMENT.md) for environment and hosting setup.

## Preserved legacy data

The application no longer reads the former SQLite database or JSON catalog
artifacts. Existing local files in `data/` and `frontend/gamedb.json` are
preserved and are not part of the active data path. Verify whether they need to
be archived before deleting them.
