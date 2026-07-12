# Data Model

## Objetivo

Este documento describe las entidades de GameTracker, sus relaciones y donde se almacenan hoy los datos.

> Documento vivo: cualquier cambio en entidades, campos o persistencia debe reflejarse aqui.

---

## Estado actual

Hoy el proyecto tiene **dos modelos de datos convivientes**:

1. **Modelo principal del prototipo** en `frontend/server/db.ts`
2. **Modelo parcial SQLite** en `backend/app/models.py`

Esto significa que la fuente de verdad depende de la capa backend que se use.

---

# 1. Modelo principal del servidor Express

El servidor Node usa una estructura en memoria + persistencia JSON en:

- `frontend/server/db.ts`
- archivo de datos: `frontend/appdata.json`

## 1.1 Entidad `User`

Representa un usuario de la aplicacion.

### Campos

- `id: string`
- `username: string`
- `email: string`
- `avatar: string`
- `bio: string`
- `createdAt: string`

### Relaciones

- 1:N con `UserGame`
- 1:N con `Review`
- 1:N con `CustomList`
- N:N con `User` via `Follow`
- 1:N con `Activity`

---

## 1.2 Entidad `Game`

Representa un videojuego importado o cargado desde IGDB.

### Campos

- `igdbId: number`
- `name: string`
- `slug: string`
- `cover: string`
- `summary: string`
- `genres: string[]`
- `platforms: string[]`
- `releaseDate: string`
- `rating?: number`
- `popularity?: number`

### Relaciones

- 1:N con `UserGame`
- 1:N con `Review`
- N:N con `CustomList` via `CustomListItem`
- 1:N potencial con `Activity`

---

## 1.3 Entidad `UserGame`

Representa el tracking de un juego por parte de un usuario.

Es una de las entidades mas importantes del sistema.

### Campos

- `userId: string`
- `gameId: number`
- `status: GameStatus`
- `rating: number`
- `hoursPlayed: number`
- `startedAt: string | null`
- `completedAt: string | null`
- `notes: string`
- `updatedAt: string`

### Notas

- `rating` usa escala 1-5
- `0` significa sin valorar
- se usa como **fuente de verdad del rating** tambien para las reviews

### Relaciones

- N:1 con `User`
- N:1 con `Game`

### Clave logica

- combinacion `userId + gameId`

---

## 1.4 Entidad `Review`

Representa una reseña publica escrita por un usuario sobre un juego.

### Campos

- `id: string`
- `userId: string`
- `gameId: number`
- `title: string`
- `content: string`
- `rating?: number`
- `likes: string[]`
- `createdAt: string`

### Notas importantes

- aunque la review expone rating, el valor real debe mantenerse sincronizado con `UserGame.rating`
- los likes se guardan como array de `userId`

### Relaciones

- N:1 con `User`
- N:1 con `Game`

---

## 1.5 Entidad `CustomList`

Representa una lista personalizada creada por un usuario.

### Campos

- `id: string`
- `userId: string`
- `name: string`
- `description: string`
- `createdAt: string`

### Relaciones

- N:1 con `User`
- 1:N con `CustomListItem`

---

## 1.6 Entidad `CustomListItem`

Tabla puente entre listas y juegos.

### Campos

- `listId: string`
- `gameId: number`

### Relaciones

- N:1 con `CustomList`
- N:1 con `Game`

---

## 1.7 Entidad `Follow`

Relacion social entre usuarios.

### Campos

- `followerId: string`
- `followingId: string`

### Relaciones

- N:1 con `User` como follower
- N:1 con `User` como followed

### Cardinalidad

- N:N entre usuarios

---

## 1.8 Entidad `Activity`

Representa eventos del feed social.

### Campos

- `id: string`
- `userId: string`
- `type: ActivityType`
- `gameId?: number`
- `targetUserId?: string`
- `details?: string`
- `createdAt: string`

### Tipos actuales

- `COMPLETED`
- `WISHLIST`
- `PLAYING`
- `REVIEWED`
- `LIST_CREATED`
- `FOLLOWED`

### Relaciones

- N:1 con `User`
- opcional N:1 con `Game`
- opcional N:1 con `User` destino

---

# 2. Modelo del backend FastAPI + SQLite

Persistencia actual:

- `backend/gametracker.db`
- ORM en `backend/app/models.py`

## 2.1 Tabla `user_games`

### Campos

- `igdb_id: int` (PK)
- `name: string`
- `cover: string`
- `status: string`
- `added_at: datetime`
- `updated_at: datetime`

### Observaciones

- este modelo no representa aun la misma riqueza que `UserGame` del servidor Express
- no incluye:
  - `userId`
  - `rating`
  - `hoursPlayed`
  - `notes`
  - `startedAt`
  - `completedAt`

Por tanto, hoy es un modelo mas simple y no equivalente funcionalmente.

---

## 2.2 Tabla `favorites`

### Campos

- `igdb_id: int` (PK)
- `name: string`
- `cover: string`
- `added_at: datetime`

---

# 3. Relaciones del dominio

## Resumen conceptual

```text
User
 |- UserGame -> Game
 |- Review   -> Game
 |- CustomList -> CustomListItem -> Game
 |- Activity
 |- Follow (con otros User)
```

## Relaciones clave

- un usuario puede trackear muchos juegos
- un juego puede ser trackeado por muchos usuarios
- un usuario puede escribir muchas reviews
- una review pertenece a un solo juego
- una lista pertenece a un usuario
- una lista contiene muchos juegos
- un usuario puede seguir a muchos usuarios

---

# 4. Fuente de verdad actual

## En la practica hoy

La fuente de verdad mas completa del producto actual es:

- `frontend/server/db.ts`
- `frontend/appdata.json`

## En transicion / secundario

La parte FastAPI + SQLite existe, pero todavia no cubre todo el dominio del producto.

## Implicacion

Antes de publicacion conviene unificar:

- usuarios
- auth
- biblioteca
- reviews
- listas
- follows
- actividad

en una unica capa persistente real.

---

# 5. Inconsistencias y deuda tecnica actual

## Duplicidad de modelos

Hay duplicidad entre:

- `UserGame` del servidor Express
- `UserGame` del backend Python

pero no tienen los mismos campos ni el mismo alcance.

## Persistencia local

La persistencia actual depende de:

- JSON local en el servidor Express
- SQLite local en el backend Python

Esto es util para desarrollo, pero no es aun una estrategia final de produccion.

---

# 6. Recomendacion de evolucion del modelo

## Corto plazo

- consolidar una unica fuente de verdad
- normalizar usuarios, juegos, tracking, reviews y follows

## Medio plazo

Migrar a base de datos relacional de produccion, idealmente:

- PostgreSQL en produccion
- SQLite solo para local/dev si se desea

## Modelo objetivo recomendado

Entidades de produccion sugeridas:

- users
- games
- user_games
- reviews
- review_likes
- lists
- list_items
- follows
- activities

---

# 7. Mantenimiento de este documento

Actualiza este archivo si:

- se añade un campo a una entidad
- cambia la relacion entre entidades
- se mueve la fuente de verdad
- se añaden tablas nuevas
- se elimina la duplicidad entre Express y FastAPI
