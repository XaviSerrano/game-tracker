# Estructura del proyecto

## Objetivo de este documento

Este archivo describe la estructura actual de GameTracker y debe servir como referencia rapida para entender:

- como esta organizado el repositorio
- donde vive cada responsabilidad
- que carpetas son codigo fuente y cuales son artefactos locales o generados
- que partes deben revisarse cuando se hace un cambio

> Documento vivo: cada vez que se añadan, eliminen o reorganicen modulos, este archivo debe actualizarse en el mismo cambio.

---

## Vista general

El repositorio esta dividido en dos bloques principales:

- `frontend/` -> aplicacion React + Vite + servidor Node/Express
- `backend/` -> backend FastAPI en Python

Ahora mismo el proyecto convive con **dos capas backend**:

1. un servidor Node/Express dentro de `frontend/`
2. un backend FastAPI dentro de `backend/`

Esto es importante porque parte del roadmap futuro consiste en consolidar la arquitectura final y reducir duplicidades.

---

## Estructura de alto nivel

```text
gametracker/
|- frontend/
|- backend/
|- docs/
```

### Raiz del repositorio

- `docs/`
  - documentacion funcional y tecnica del proyecto

### `docs/`

- `ROADMAP.md`
  - roadmap general del producto hasta publicacion web y movil
- `PROJECT_STRUCTURE.md`
  - este documento
- `API_OVERVIEW.md`
  - mapa de endpoints y capas API actuales
- `DATA_MODEL.md`
  - entidades, relaciones y fuentes de verdad del modelo de datos
- `DEPLOYMENT.md`
  - guia de despliegue web y movil
- `CONTRIBUTING.md`
  - guia de colaboracion y flujo de trabajo recomendado
- `CHANGELOG.md`
  - historial de cambios funcionales y tecnicos del proyecto
- `ARCHITECTURE_DECISIONS.md`
  - registro de decisiones de arquitectura

---

## Frontend

Ruta principal:

```text
frontend/
|- src/
|  |- components/
|  |- App.tsx
|  |- main.tsx
|  |- index.css
|  |- types.ts
|- server/
|  |- db.ts
|  |- igdb.ts
|- server.ts
|- package.json
|- vite.config.ts
|- appdata.json
|- dist/
```

### `frontend/src/`

Contiene la aplicacion cliente en React.

#### `frontend/src/App.tsx`

- shell principal de la aplicacion
- navegacion general entre vistas
- control de sesion del usuario en cliente
- seleccion de vistas como feed, descubrir, biblioteca, listas, estadisticas y perfil

#### `frontend/src/main.tsx`

- punto de entrada del frontend React

#### `frontend/src/index.css`

- estilos globales de la aplicacion

#### `frontend/src/types.ts`

- tipos compartidos del frontend
- define entidades como:
  - `User`
  - `Game`
  - `UserGame`
  - `Review`
  - `CustomList`
  - `Activity`

### `frontend/src/components/`

Componentes principales de interfaz:

- `Onboarding.tsx`
  - entrada, login/registro y acceso inicial
- `HomeFeed.tsx`
  - feed principal de actividad y recomendaciones
- `Discover.tsx`
  - busqueda y exploracion de juegos
- `GameDetails.tsx`
  - detalle de juego, tracking, rating, fechas, reviews y plataformas
- `Library.tsx`
  - biblioteca del usuario
- `CustomLists.tsx`
  - listas personalizadas
- `UserProfile.tsx`
  - perfil publico/propio y actividad social asociada
- `StatsDashboard.tsx`
  - estadisticas del usuario
- `DatePicker.tsx`
  - selector visual/manual de fechas reutilizable

### `frontend/server.ts`

- servidor Express que da soporte a la aplicacion
- expone rutas API consumidas por el frontend
- actua como backend principal del prototipo actual
- integra autenticacion simulada, social, biblioteca, reviews, listas, estadisticas y recomendaciones

### `frontend/server/`

#### `frontend/server/db.ts`

- capa de persistencia local del servidor Node
- gestiona usuarios, juegos, reviews, listas, follows, actividad y recomendaciones
- actualmente usa almacenamiento local tipo JSON

#### `frontend/server/igdb.ts`

- integracion con IGDB desde el lado Node
- busqueda y detalle de juegos

### `frontend/package.json`

- scripts principales:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
- dependencias de React, Vite, Express, Recharts, Lucide y Simple Icons

### `frontend/appdata.json`

- almacenamiento local de datos del servidor Express
- debe tratarse como dato de entorno/desarrollo, no como fuente de verdad de produccion

### `frontend/dist/`

- salida compilada de produccion
- artefacto generado

### Otras rutas locales en `frontend/`

- `node_modules/`
  - dependencias instaladas
- `assets/`
  - recursos estaticos del frontend si se usan
- `gamedb.json`, `metadata.json`
  - ficheros auxiliares/locales del entorno actual

---

## Backend Python

Ruta principal:

```text
backend/
|- app/
|  |- routers/
|  |- services/
|  |- config.py
|  |- database.py
|  |- main.py
|  |- models.py
|  |- schemas.py
|- requirements.txt
|- gametracker.db
```

### `backend/app/main.py`

- punto de entrada de FastAPI
- configura CORS
- registra routers
- crea tablas al arrancar

### `backend/app/config.py`

- carga configuracion y variables de entorno
- incluye credenciales de Twitch/IGDB

### `backend/app/database.py`

- configuracion de SQLAlchemy async
- engine, session factory y creacion de tablas

### `backend/app/models.py`

- modelos ORM
- actualmente incluye tablas como:
  - `user_games`
  - `favorites`

### `backend/app/schemas.py`

- esquemas Pydantic para requests/responses del backend Python

### `backend/app/routers/`

- `games.py`
  - endpoints de catalogo, busqueda y detalle de juegos
- `library.py`
  - endpoints de biblioteca y favoritos del backend Python

### `backend/app/services/`

- `igdb.py`
  - autenticacion con Twitch
  - consultas a IGDB
  - transformacion de datos para el frontend

### `backend/requirements.txt`

- dependencias Python del backend:
  - FastAPI
  - Uvicorn
  - HTTPX
  - SQLAlchemy
  - aiosqlite
  - pydantic-settings

### `backend/gametracker.db`

- base de datos SQLite local del backend Python

### Otras rutas locales en `backend/`

- `venv/`
  - entorno virtual local
- `.env`
  - variables de entorno locales
- `check_db.py`
  - script utilitario local presente actualmente en el entorno

---

## Relacion entre piezas

### Flujo actual simplificado

#### Lado frontend web

```text
React components
  -> fetch a /api/...
  -> Express server (frontend/server.ts)
  -> db.ts / igdb.ts
```

#### Lado backend Python

```text
FastAPI main
  -> routers
  -> services
  -> database/models/schemas
  -> SQLite
```

### Situacion actual importante

El proyecto no esta aun totalmente consolidado sobre un unico backend.  
Por eso, antes de produccion, habra que decidir:

- si Express se mantiene
- si FastAPI se convierte en backend principal
- o si ambos se separan con roles bien definidos

---

## Convenciones practicas para trabajar en este repo

### Si cambias UI o comportamiento de una vista

Revisa normalmente:

- `frontend/src/components/...`
- `frontend/src/types.ts`
- `frontend/src/App.tsx` si afecta a navegacion o flujo principal

### Si cambias una API del servidor Node

Revisa normalmente:

- `frontend/server.ts`
- `frontend/server/db.ts`
- `frontend/server/igdb.ts`
- componentes que consumen esa ruta

### Si cambias el backend Python

Revisa normalmente:

- `backend/app/main.py`
- `backend/app/routers/...`
- `backend/app/services/...`
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/database.py`

### Si cambias persistencia

Revisa:

- `frontend/server/db.ts` si afecta al backend Node
- `backend/app/models.py` y `backend/app/database.py` si afecta al backend Python
- documentos funcionales como `ROADMAP.md` y este archivo si cambia la arquitectura

---

## Que carpetas son fuente de verdad y cuales no

### Codigo fuente principal

- `frontend/src/`
- `frontend/server/`
- `frontend/server.ts`
- `backend/app/`

### Archivos de configuracion

- `frontend/package.json`
- `frontend/vite.config.ts`
- `backend/requirements.txt`
- `backend/.env`

### Archivos generados o locales

- `frontend/dist/`
- `frontend/node_modules/`
- `frontend/appdata.json`
- `backend/venv/`
- `backend/gametracker.db`

Estos archivos pueden existir en local, pero no deben confundirse con la arquitectura fuente del proyecto.

---

## Cuando actualizar este documento

Actualiza `PROJECT_STRUCTURE.md` cuando ocurra cualquiera de estos cambios:

- se cree una carpeta nueva relevante
- se elimine o fusione un modulo importante
- cambie el backend principal
- se mueva logica entre `frontend/` y `backend/`
- se añada una capa nueva:
  - auth
  - tests
  - mobile
  - CI/CD
  - infraestructura

### Regla recomendada

Si un cambio obliga a otro desarrollador a preguntarse "ahora esto donde vive?", entonces este documento debe actualizarse.

---

## Proximas ampliaciones recomendadas de esta documentacion

Mas adelante este archivo puede crecer con secciones nuevas:

- diagrama de arquitectura
- mapa de rutas API
- modelo de datos
- estrategia de despliegue
- convenciones de naming
- flujo de estados del usuario

---

## Resumen corto

Hoy GameTracker tiene:

- una app React en `frontend/src`
- un servidor Node/Express en `frontend/server.ts`
- un backend FastAPI en `backend/app`
- integracion con IGDB
- persistencia local/prototipo en distintos puntos

Este documento debe mantenerse sincronizado con la estructura real del proyecto mientras la arquitectura evoluciona.
