# Data Model

GameTracker's active application data is stored in PostgreSQL through
`backend/src/db.ts`. The database pool uses `DATABASE_URL`; `initDb()` creates
tables and applies idempotent migrations before the API starts.

## Tables

| Table | Purpose |
|---|---|
| `users` | Profiles, password hash/salt, and password-reset state |
| `games` | IGDB game details cached/imported by the API |
| `userGames` | Per-user status, rating, playtime, and notes |
| `reviews` | User-written reviews and stored likes |
| `customLists` | User-owned lists |
| `customListItems` | Games included in custom lists |
| `follows` | User-to-user follow relationships |
| `activities` | Social activity feed entries |
| `sessions` | Session tokens and expiration |
| `securityEvents` | Authentication and security audit events |

`userGames`, `reviews`, and list items reference `games("igdbId")`; user-owned
records reference `users(id)`. Existing IDs and column names are part of the
current database contract and should not be changed without a migration.

## Domain relationships

```text
User -> UserGame -> Game
User -> Review -> Game
User -> CustomList -> CustomListItem -> Game
User -> Follow -> User
User -> Activity -> optional Game/User
```

The shared TypeScript contracts live in `shared/types.ts`. The frontend
re-exports them through `frontend/src/types.ts`; backend modules import the
shared types directly.

## Single source of truth

PostgreSQL is the only supported application database. The former FastAPI
service used a separate SQLite schema for a partial library/favorites model;
that code is retired and is not read or migrated by the active application.
Local SQLite sidecar files and JSON catalog snapshots are preserved as legacy
artifacts until their owner confirms whether they can be archived or removed.

## Migration rules

- Add schema changes in `initDb()` in `backend/src/db.ts`.
- Make schema operations safe to run on every startup (`IF NOT EXISTS`,
  idempotent updates).
- Preserve foreign keys and the existing `games("igdbId")` key.
- Update this document and relevant API contracts alongside schema changes.
