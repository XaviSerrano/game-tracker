# GameTracker

GameTracker is a React + Vite game-discovery and library app backed by a single
Express API, PostgreSQL, and IGDB.

## Architecture

- `frontend/` contains only the React/Vite SPA, styled with Tailwind CSS. It is
  deployed to Vercel.
- `backend/` contains the Express API, PostgreSQL data layer, and the sole IGDB
  integration. It is deployed to Render.
- `shared/types.ts` contains types used by both applications.
- The frontend calls relative `/api/*` URLs. Vite proxies these requests to
  Express in development; Vercel rewrites them to the Render service in
  production. This keeps browser requests same-origin for the session cookie.

## Local development

Prerequisites: Node.js 22+ and a PostgreSQL database.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `DATABASE_URL`, `IGDB_CLIENT_ID`, and `IGDB_CLIENT_SECRET`. SMTP settings
   are optional for local development.
3. Install dependencies and start both applications from the repository root:

   ```sh
   npm install
   npm --prefix backend install
   npm --prefix frontend install
   npm run dev
   ```

   The frontend is available at `http://localhost:3000`; Express listens on
   `http://localhost:3001`.

You can also run `npm run dev` from `frontend/`; it starts both services using
the root command. Use `npm run dev:vite` in `frontend/` only when the backend
is already running separately. Stop any previous Vite process before starting
both services, or set `FRONTEND_PORT` to use another frontend port.

To build both projects, run `npm run build`. `npm run lint` checks backend and
frontend TypeScript.

## Deployment

- **Render:** configure the web service from `render.yaml` with root directory
  `backend`, build command `npm ci && npm run build`, and start command
  `npm start`. Set the backend variables described in `backend/.env.example`.
- **Vercel:** set the project root to `frontend` and build with `npm run build`.
  `frontend/vercel.json` forwards `/api/*` to the Render API and serves the SPA.
- Keep `DATABASE_URL`, Twitch client secret, and SMTP credentials on the backend
  only. Do not put backend secrets in `VITE_*` variables.

PostgreSQL is the only supported application database. The backend creates and
updates its schema idempotently at startup via `initDb()`.

## Documentation

See [`docs/README.md`](./docs/README.md) for the documentation index, and
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for deployment details.
