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
   `DATABASE_URL` plus `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET`. To enable
   Google sign-in, set the same Google OAuth web client ID as
   `GOOGLE_CLIENT_ID` in `backend/.env` and `VITE_GOOGLE_CLIENT_ID` in
   `frontend/.env`.
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
| `DATABASE_URL` | Yes | Managed PostgreSQL connection string. Remote connections verify the server certificate using Node.js's trusted CAs. |
| `DATABASE_SSL_CA` | No | PEM-encoded CA certificate if the PostgreSQL provider uses a private CA; do not use an unverified certificate. |
| `IGDB_CLIENT_ID` | Yes | Twitch Developer application client ID |
| `IGDB_CLIENT_SECRET` | Yes | Keep private; backend only |
| `GOOGLE_CLIENT_ID` | For Google sign-in | Public OAuth web client ID; must match the frontend client ID |
| `PUBLIC_APP_URL` | Yes | Public frontend URL used in password-reset links. Required in production; local development defaults to `http://localhost:3000`. |
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
deployed API. Its API rewrite must remain before the SPA fallback. Set
`VITE_GOOGLE_CLIENT_ID` to the same OAuth web client ID used by the backend.
Never define database, Twitch client secret, or SMTP credentials as Vercel
`VITE_*` variables.

In Google Cloud Console, create a Web application OAuth client and add the local
and production frontend origins to its authorized JavaScript origins. Configure
the same client ID in both Render and Vercel. Google sign-in is currently
available on the web; the Capacitor Android app needs a separate native Google
sign-in integration.

The API is accessed through Vercel rewrites, so backend CORS is not needed for
the browser deployment model. The Android app uses Capacitor's native HTTP
transport to call Render, not a browser cross-origin request. Its session uses
the existing backend cookie; no change to web CORS or SameSite is required.

## Android release

See `frontend/README.md` for the build and Android Studio workflow. The app ID
is `space.gametracker.app`; confirm it before the first Play release. Android
requires the deployed backend to include the account-deletion endpoint.

Before submitting to Google Play:

- Publish an accurate privacy policy and a public account-deletion request URL;
  document the controller, contact, data processing, retention and backups.
- Verify deletion on a test account, including linked content, other users'
  review likes, session invalidation and retained security logs. Security logs
  retain IP and user-agent data even after their user reference is removed.
- Test authentication, restored sessions, recovery, navigation, system Back,
  rotation, keyboard and safe areas on real Android devices.
- Verify the store listing, app icon, screenshots, data-safety declarations,
  target API level and current testing requirements in Play Console.
- Generate a signed AAB in Android Studio and securely back up the release
  keystore and credentials outside the repository. Never commit signing keys.

No signing key, privacy policy, public deletion-request page or Play Console
configuration is supplied by the build. Do not treat a debug APK as a release.

## Search visibility

The production build prerenders the English landing page into `dist/index.html`.
The Vercel fallback serves `dist/app.html` for other SPA routes so they do not
initially contain the landing page or its canonical URL. React still renders the
interactive application and updates route metadata in the browser. The default
language is English; Spanish is selected in the application, not via a separate
indexable URL.

`frontend/public/robots.txt` points to the sitemap for `https://gametracker.space`.
The sitemap lists the landing and public Discover page, but not private views,
authentication modals, or dynamically loaded game pages. Canonical and social
URLs use the same domain. If the production domain changes, update the sitemap,
robots file, HTML metadata and route metadata together.

After deployment, check that `/robots.txt` returns plain text and `/sitemap.xml`
returns XML rather than the SPA, and that `www.gametracker.space` redirects to
the preferred domain. Submit the sitemap in Google Search Console and inspect
the landing and Discover URLs. Game and Discover content and route-specific
metadata still require JavaScript; link previews that do not execute JavaScript
see the generic SPA metadata on those routes. Unknown SPA routes also require
hosting-side HTTP 404 handling to avoid soft 404s.

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

The account-deletion integration test requires a **dedicated disposable**
PostgreSQL database and a backend running against that same database. Set
`TEST_DATABASE_URL` and `TEST_API_URL`, then run
`node --test src/account-deletion.test.mjs` from `backend/`. Do not point this
test at production. Run `node --test scripts/api.test.mjs` from `frontend/` for
the web and Android API client behavior.

## Secrets and local data

- Keep service secrets in backend environment settings or an ignored
  `backend/.env`; use `backend/.env.example` as the template.
- Rotate credentials if they have been committed or otherwise exposed.
- Existing legacy SQLite/JSON files were not deleted as part of this migration.
  Confirm whether they contain data to archive before removing them.
