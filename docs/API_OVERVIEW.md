# API Overview

GameTracker has one API: the Express service in `backend/src/server.ts`.
PostgreSQL access is implemented in `backend/src/db.ts`; IGDB access is
implemented in `backend/src/services/igdb.ts`. FastAPI and its separate SQLite
API have been retired.

The SPA uses relative `/api/*` URLs. In development Vite proxies requests to
Express at `http://localhost:3001`; Vercel rewrites them to the Render service.
The browser therefore uses the frontend origin for API calls and the session
cookie.

## Routes

`Auth` indicates routes requiring the `gt_session` cookie or a bearer token.

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Service health check | No |
| POST | `/api/auth/register` | Register a user and create a session | No |
| POST | `/api/auth/login` | Authenticate and create a session | No |
| POST | `/api/auth/forgot-password` | Request a password-reset link | No |
| POST | `/api/auth/reset-password` | Set a password with a reset token | No |
| POST | `/api/auth/logout` | Revoke the current session | Yes |
| GET | `/api/auth/me` | Return the current user | Yes |
| GET | `/api/users?search=...` | Search public usernames | No |
| GET | `/api/users/:id` | Read a public profile and follow counts | No |
| PUT | `/api/users/profile` | Update the current profile | Yes |
| GET | `/api/users/:id/library` | Read a user's library | No |
| GET | `/api/users/:id/stats` | Read user statistics | No |
| GET | `/api/social/feed` | Read public or following activity | No |
| POST | `/api/social/follow/:userId` | Follow/unfollow a user | Yes |
| GET | `/api/social/followers/:userId` | List followers | No |
| GET | `/api/social/following/:userId` | List followed users | No |
| GET | `/api/discover/home` | Load IGDB Discover sections | No |
| GET | `/api/discover/popular?page=0` | Load 15 popular-now games per page | No |
| GET | `/api/games/search` | Search IGDB with filters and pagination | No |
| GET | `/api/games` | Compatibility catalog search | No |
| GET | `/api/games/igdb/search?q=...` | Compatibility IGDB text search | No |
| GET | `/api/igdb/genres` | List IGDB genres | No |
| GET | `/api/igdb/platforms` | List all IGDB platforms | No |
| GET | `/api/games/genres` | List genres used by games | No |
| GET | `/api/games/:id` | Read a game detail | No |
| POST | `/api/games/import/:id` | Fetch and persist a game from IGDB | No |
| POST | `/api/library` | Add or update a library entry | Yes |
| DELETE | `/api/library/:id` | Remove a library entry | Yes |
| GET | `/api/reviews/:gameId` | List a game's reviews | No |
| POST | `/api/reviews` | Publish a review | Yes |
| POST | `/api/reviews/:id/like` | Toggle a review like | Yes |
| GET | `/api/lists?userId=...` | List public lists, optionally by owner | No |
| GET | `/api/lists/:id` | Read a list and its games | No |
| POST | `/api/lists` | Create a list | Yes |
| PUT | `/api/lists/:id` | Update an owned list | Yes |
| DELETE | `/api/lists/:id` | Delete an owned list | Yes |

## IGDB behavior

All game discovery requests use the single Node service. It caches the Twitch
OAuth token, coalesces duplicate in-flight requests, serializes IGDB requests,
normalizes game data, and caches catalog and taxonomy results. Credentials must
remain in the backend environment; never expose them through `VITE_*` variables.

## Persistence

PostgreSQL is the only supported application database. The Express service
initializes its schema idempotently at startup. The former FastAPI routes used a
different, local SQLite database and did not share Express contracts or data.
