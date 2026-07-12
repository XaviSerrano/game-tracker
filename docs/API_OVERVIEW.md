# API Overview

## Objetivo

Este documento resume las APIs disponibles actualmente en GameTracker y aclara que, a dia de hoy, el proyecto tiene **dos capas backend**:

1. **Express/Node** en `frontend/server.ts`
2. **FastAPI/Python** en `backend/app/`

> Documento vivo: si se añade, modifica o elimina un endpoint, este archivo debe actualizarse en el mismo cambio.

---

## Estado actual de la arquitectura API

### API principal consumida por la app React

La aplicacion frontend usa principalmente los endpoints expuestos por:

- `frontend/server.ts`

Esta es la capa que hoy soporta:

- autenticacion
- usuarios
- social
- biblioteca
- reviews
- listas
- estadisticas
- recomendaciones
- consumo de IGDB

### API secundaria / alternativa

El backend Python en:

- `backend/app/main.py`

expone rutas para:

- juegos
- biblioteca
- favoritos

Actualmente no parece ser la capa principal de consumo del frontend para toda la experiencia completa.

---

# 1. Express API (`frontend/server.ts`)

Base URL en desarrollo:

```text
http://localhost:3000
```

## 1.1 Autenticacion

### `POST /api/auth/register`

Registra un usuario nuevo.

#### Body

```json
{
  "username": "string",
  "email": "string",
  "bio": "string opcional",
  "avatar": "string opcional"
}
```

#### Respuesta

```json
{
  "user": {},
  "token": "user_id"
}
```

#### Notas

- el token actual es el `id` del usuario
- flujo de autenticacion todavia tipo prototipo/demo

---

### `POST /api/auth/login`

Inicia sesion con email.

#### Body

```json
{
  "email": "string"
}
```

#### Respuesta

```json
{
  "user": {},
  "token": "user_id"
}
```

---

### `GET /api/auth/me`

Devuelve el usuario autenticado.

#### Headers

```text
Authorization: Bearer <token>
```

---

## 1.2 Usuarios

### `GET /api/users/:id`

Obtiene el perfil publico de un usuario.

#### Respuesta

- datos base del usuario
- `followersCount`
- `followingCount`

---

### `PUT /api/users/profile`

Actualiza el perfil del usuario autenticado.

#### Headers

```text
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body

```json
{
  "username": "string opcional",
  "bio": "string opcional",
  "avatar": "string opcional"
}
```

---

## 1.3 Social

### `GET /api/social/feed`

Obtiene actividad social.

#### Query params

- `scope=all|following`
- `userId=<id>` cuando se usa `following`

---

### `POST /api/social/follow/:userId`

Sigue o deja de seguir a otro usuario.

#### Headers

```text
Authorization: Bearer <token>
```

#### Respuesta

```json
{
  "following": true
}
```

---

### `GET /api/social/followers/:userId`

Lista seguidores del usuario.

---

### `GET /api/social/following/:userId`

Lista usuarios seguidos por el usuario.

---

## 1.4 Juegos

### `GET /api/games`

Catálogo general de juegos desde IGDB.

#### Query params opcionales

- `search`
- `genre`
- `platform`
- `sort=popularity|rating|name|newest`

---

### `GET /api/games/igdb/search`

Busqueda en IGDB.

#### Query params

- `q`

---

### `GET /api/games/:id`

Obtiene detalle de un juego por `igdbId`.

---

### `POST /api/games/import/:id`

Importa un juego a la cache/base local del servidor Express.

#### Notas

- si el juego ya existe localmente, devuelve el existente
- si no existe, lo carga desde IGDB y lo guarda

---

## 1.5 Biblioteca

### `GET /api/users/:id/library`

Obtiene la biblioteca completa de un usuario con detalle de juego embebido.

#### Devuelve

- datos de `UserGame`
- objeto `game`

---

### `POST /api/library`

Crea o actualiza el tracking de un juego del usuario autenticado.

#### Headers

```text
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body

```json
{
  "gameId": 123,
  "status": "WISHLIST|PLAYING|PLAYED|COMPLETED|ABANDONED",
  "rating": 0,
  "hoursPlayed": 0,
  "notes": "",
  "startedAt": "YYYY-MM-DD o null",
  "completedAt": "YYYY-MM-DD o null"
}
```

#### Notas

- funciona como upsert
- registra actividad social cuando cambia el estado

---

### `DELETE /api/library/:id`

Elimina un juego de la biblioteca del usuario autenticado.

---

## 1.6 Reviews

### `GET /api/reviews/:gameId`

Obtiene reseñas de un juego.

#### Devuelve

- review
- author embebido
- `rating` sincronizado desde `UserGame`

---

### `POST /api/reviews`

Publica una reseña.

#### Headers

```text
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body

```json
{
  "gameId": 123,
  "title": "string",
  "content": "string",
  "rating": 1
}
```

#### Notas importantes

- el rating usa como fuente de verdad `UserGame`
- si el usuario no tenia tracking, crea/actualiza uno con estado `PLAYED`

---

### `POST /api/reviews/:id/like`

Da like o quita like a una reseña.

#### Headers

```text
Authorization: Bearer <token>
```

---

## 1.7 Listas personalizadas

### `GET /api/lists`

Obtiene listas.

#### Query param opcional

- `userId`

Si se envía `userId`, filtra por ese usuario.

---

### `GET /api/lists/:id`

Obtiene detalle de una lista:

- metadatos de lista
- autor
- juegos incluidos

---

### `POST /api/lists`

Crea una lista nueva.

#### Headers

```text
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body

```json
{
  "name": "string",
  "description": "string opcional",
  "gameIds": [1, 2, 3]
}
```

#### Notas

- actualmente este endpoint crea listas nuevas
- no hay endpoint dedicado de update

---

### `DELETE /api/lists/:id`

Elimina una lista del usuario autenticado.

---

## 1.8 Estadisticas

### `GET /api/users/:id/stats`

Obtiene estadisticas agregadas del usuario:

- horas totales
- juegos completados
- genero favorito
- plataforma favorita
- top rated games
- actividad mensual
- distribucion de plataformas y generos

---

## 1.9 Recomendaciones

### `GET /api/recommendations`

Obtiene recomendaciones personalizadas.

#### Headers

```text
Authorization: Bearer <token>
```

#### Notas

El motor actual es hibrido:

- 40% similitud entre usuarios
- 35% relaciones sociales
- 25% similitud de contenido

---

# 2. FastAPI (`backend/app`)

Base URL habitual en desarrollo:

```text
http://localhost:8000
```

## 2.1 Juegos

### `GET /api/games`

Catálogo popular desde IGDB.

#### Query params

- `sort=popularity|rating|newest|name`
- `genre`
- `platform`

---

### `GET /api/games/igdb/search`

Busca juegos por texto.

#### Query params

- `q`

---

### `GET /api/games/:igdb_id`

Devuelve detalle del juego por ID de IGDB.

---

## 2.2 Biblioteca

### `GET /api/library`

Lista items de la biblioteca SQLite del backend Python.

---

### `POST /api/library`

Añade un juego a la biblioteca SQLite.

#### Body

Según `UserGameCreate`:

- `igdb_id`
- `name`
- `cover`
- `status`

---

### `PATCH /api/library/:igdb_id`

Actualiza solo el `status`.

---

### `DELETE /api/library/:igdb_id`

Elimina un item de la biblioteca.

---

## 2.3 Favoritos

### `GET /api/favorites`

Lista favoritos.

---

### `POST /api/favorites`

Añade favorito.

#### Body

- `igdb_id`
- `name`
- `cover`

---

### `DELETE /api/favorites/:igdb_id`

Elimina favorito.

---

# 3. Observaciones y deuda tecnica actual

## Duplicidad de APIs

Actualmente existen rutas solapadas entre Express y FastAPI para:

- juegos
- biblioteca

Esto complica:

- documentacion
- mantenimiento
- despliegue
- definicion de fuente de verdad

## Recomendacion

Antes de publicacion, conviene decidir:

- una API principal
- una estrategia de auth real
- una unica capa de persistencia principal

---

# 4. Mantenimiento de este documento

Actualiza este archivo cuando:

- cambie una ruta
- cambie el body o response de un endpoint
- se añada autenticacion a una ruta
- se mueva una responsabilidad entre Express y FastAPI
- se elimine una API duplicada
