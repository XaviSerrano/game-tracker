# GameTracker frontend

The frontend is a static React + Vite SPA. It does not contain an API server.
Running `npm run dev` here or from the repository root starts Vite and the
Express backend together. To run only Vite when the backend is already running,
use `npm run dev:vite`. Stop any existing Vite process first, or set
`FRONTEND_PORT` to a free port.

All API calls use relative `/api/*` URLs. Vite proxies them to
`http://localhost:3001` in development, and `vercel.json` rewrites them to the
Render backend in production.

No frontend environment variables or backend secrets are required. The root
and backend dependencies must also be installed before starting both services.
See the repository [README](../README.md) for setup and deployment.
