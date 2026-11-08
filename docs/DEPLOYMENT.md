# Deployment

## Architecture

- **Frontend:** static React + Vite SPA on Vercel (`frontend/`).
- **Backend:** Express API on Render (`backend/`).
- **Database:** managed PostgreSQL, shared only by the Express service.
- **Game catalog:** IGDB via the backend's sole IGDB integration.

The browser uses relative `/api/*` URLs. Vite proxies these requests to
`localhost:3001` locally. In production, `frontend/vercel.json` rewrites them to
the Render backend, keeping API requests and the `HttpOnly` session cookie on
the frontend origin. Direct cross-origin API calls are not required.

## Local development

1. Install root, backend, and frontend dependencies:

   ```sh
   npm install
   npm --prefix backend install
   npm --prefix frontend install
   ```

2. Copy `backend/.env.example` to `backend/.env` and set a PostgreSQL
   `DATABASE_URL` plus `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET`.
3. Start both processes with `npm run dev`, either from the repository root or
   from `frontend/`. Run `npm run dev:vite` in `frontend/` only when the backend
   is already running separately.

Vite listens on port `3000`; Express defaults to port `3001`. `PORT` can
override the backend port. The Vite proxy target must be updated if that default
changes. Stop any existing Vite process before starting both services, or set
`FRONTEND_PORT` to a free port; Vite will report an error rather than switch
automatically to the backend's port.

## Render backend

The repository's `render.yaml` configures the service root as `backend/`, runs
`npm ci && npm run build`, starts with `npm start`, and checks `/health`.

Configure these values in the Render service environment:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Managed PostgreSQL connection string |
| `IGDB_CLIENT_ID` | Yes | Twitch Developer application client ID |
| `IGDB_CLIENT_SECRET` | Yes | Keep private; backend only |
| `PUBLIC_APP_URL` | Recommended | Public Vercel URL used in reset links |
| `SMTP_HOST` | For email delivery | SMTP server |
| `SMTP_PORT` | No | Defaults to `587` |
| `SMTP_SECURE` | No | Set `true` when SMTP requires implicit TLS |
| `SMTP_USER` | For authenticated SMTP | SMTP username |
| `SMTP_PASS` | For authenticated SMTP | SMTP password |
| `SMTP_FROM` | No | Sender; defaults to a local placeholder |
| `PORT` | No | Assigned by Render |
| `NODE_ENV` | No | Render sets production mode in `render.yaml` |

Express calls `initDb()` before listening. Schema setup and column additions
must remain idempotent. Connect the Render service to its managed PostgreSQL
instance; do not rely on local SQLite files or ephemeral service storage.

## Vercel frontend

Set the Vercel project root directory to `frontend/` and use:

- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`

Check that the Render URL in `frontend/vercel.json` is the public URL of the
deployed API. Its API rewrite must remain before the SPA fallback. No frontend
environment variables are needed. Never define database, Twitch client secret,
or SMTP credentials as Vercel `VITE_*` variables.

The API is accessed through Vercel rewrites, so backend CORS is not needed for
the current deployment model. If the frontend later calls Render directly,
configure an explicit frontend origin and credentialed CORS, and revisit cookie
`SameSite`/domain settings before changing the client URL.

## Validation and release checks

Run from the repository root:

```sh
npm run lint
npm run build
```

Before release, verify registration, login/session restoration/logout,
password reset email, library updates, reviews, lists, follows, statistics, and
Discover against the deployed services. Confirm Render's health check and
Vercel's `/api/*` rewrite target. Automated end-to-end coverage is not currently
configured.

## Secrets and local data

- Keep service secrets in backend environment settings or an ignored
  `backend/.env`; use `backend/.env.example` as the template.
- Rotate credentials if they have been committed or otherwise exposed.
- Existing legacy SQLite/JSON files were not deleted as part of this migration.
  Confirm whether they contain data to archive before removing them.
