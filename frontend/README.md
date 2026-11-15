# GameTracker frontend

The frontend is a static React + Vite SPA. It does not contain an API server.
Running `npm run dev` here or from the repository root starts Vite and the
Express backend together. To run only Vite when the backend is already running,
use `npm run dev:vite`. Stop any existing Vite process first, or set
`FRONTEND_PORT` to a free port.

Web API calls use relative `/api/*` URLs. Vite proxies them to
`http://localhost:3001` in development, and `vercel.json` rewrites them to the
Render backend in production.

The Android build uses Capacitor's native HTTP transport and the existing
`HttpOnly` session cookie to call Render directly. Its default API origin is
`https://gametracker-wk5b.onrender.com`; set the public
`VITE_ANDROID_API_ORIGIN` at build time to override it with an HTTPS origin.
This value is packaged into the app and must never contain a secret.
Unlike a browser-only `HttpOnly` cookie, the native HTTP plugin exposes raw
response headers to the JavaScript bridge. Treat injected scripts as able to
access native session responses; review this risk before publishing.

## Android

Install Node.js 22+, Android Studio, its Android SDK, and JDK 21. From
`frontend/`, run:

```sh
npm ci
npm run build:android
npm run android
```

In Android Studio, run the app on a device or emulator. Repeat
`npm run build:android` after web changes before rebuilding the native app.
The Android build uses the SPA entry point rather than the prerendered web
landing page, and excludes the web AdSense script.

The app ID is `space.gametracker.app`. Test login, session restoration after
restart, logout, navigation, external links, and account deletion on actual
devices before release. Password recovery currently opens the web recovery
flow; the app does not yet support Android App Links.

The root
and backend dependencies must also be installed before starting both services.
See the repository [README](../README.md) for setup and deployment.
