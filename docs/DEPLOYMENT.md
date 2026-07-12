# Deployment Guide

## Objetivo

Este documento describe una estrategia recomendada para desplegar GameTracker:

1. como aplicacion web
2. como aplicacion movil

Tambien deja documentado el estado actual y los pasos previos necesarios.

> Documento vivo: debe actualizarse cuando cambie la arquitectura, los proveedores elegidos o el proceso de release.

---

## Estado actual

Hoy el proyecto tiene:

- frontend React + Vite
- servidor Express en `frontend/server.ts`
- backend FastAPI en `backend/`
- consumo de IGDB/Twitch
- persistencia local/prototipo

Esto significa que **todavia no esta listo para publicacion directa sin consolidacion previa**.

---

# 1. Recomendacion de estrategia

## Prioridad recomendada

### Primero

Publicar una **version web estable**

### Despues

Reutilizar la base React para empaquetarla como app movil con:

- **Capacitor**

## Motivo

Esta estrategia:

- reduce tiempo de salida
- evita duplicar frontend
- permite validar producto antes de entrar en App Store / Google Play

---

# 2. Despliegue web

## 2.1 Objetivo de arquitectura recomendado

Antes de desplegar hay que decidir una de estas opciones:

### Opcion A

Mantener `frontend/server.ts` como backend principal.

### Opcion B

Mover la logica principal a FastAPI y dejar React separado.

### Opcion C

Separar claramente:

- frontend estatico
- API backend unica

## Recomendacion actual

Para salir mas rapido:

- mantener Express como backend principal temporal
- dejar FastAPI para migracion o consolidacion posterior

---

## 2.2 Entornos recomendados

Definir al menos tres entornos:

- `local`
- `staging`
- `production`

Cada uno con:

- variables de entorno propias
- base de datos propia
- endpoints propios si aplica

---

## 2.3 Variables de entorno

Minimo esperado:

### Frontend/Express

- `PORT`
- credenciales IGDB/Twitch si se consumen desde Node
- futuros secretos de auth

### FastAPI

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- futura URL de base de datos de produccion

## Recomendacion

- no commitear `.env`
- mantener `.env.example` actualizado

---

## 2.4 Base de datos

## Estado actual

- Express usa `appdata.json`
- FastAPI usa `backend/gametracker.db`

## Recomendacion para produccion

- usar **PostgreSQL**

## Motivo

- multiusuario real
- integridad de datos
- mejor escalabilidad
- facilidad de backups

---

## 2.5 Hosting recomendado

### Opcion simple

- frontend + servidor Node:
  - **Render**
  - **Railway**
  - **Fly.io**

### Opcion separada

- frontend estatico:
  - **Vercel**
  - **Netlify**
- backend/API:
  - **Render**
  - **Railway**
  - **Fly.io**

### Opcion avanzada

- VPS propio
- Docker
- reverse proxy con Nginx

---

## 2.6 Build actual del frontend

Scripts actuales en `frontend/package.json`:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

### Build actual

```bash
npm run build
```

Genera:

- `dist/` para frontend
- `dist/server.cjs` para el servidor Node empaquetado

### Start de produccion

```bash
npm run start
```

---

## 2.7 Checklist antes del despliegue web

- [ ] decidir backend principal
- [ ] definir base de datos de produccion
- [ ] eliminar dependencias de datos mock como flujo principal
- [ ] implementar auth real
- [ ] revisar CORS
- [ ] revisar logs y manejo de errores
- [ ] revisar variables de entorno
- [ ] revisar SEO basico
- [ ] revisar responsive
- [ ] revisar rutas protegidas
- [ ] revisar rendimiento del bundle

---

## 2.8 Pipeline recomendado de despliegue web

### Paso 1

Push a rama de desarrollo o staging

### Paso 2

CI ejecuta:

- `npm run lint`
- `npm run build`

### Paso 3

Despliegue a staging

### Paso 4

QA manual:

- login
- discover
- game details
- biblioteca
- reviews
- listas
- perfil
- estadisticas

### Paso 5

Promocion a produccion

---

## 2.9 Observabilidad recomendada

- error tracking: **Sentry**
- analytics: opcional, por ejemplo Plausible o GA4
- uptime monitoring
- logs persistentes del backend

---

# 3. Despliegue movil

## 3.1 Estrategia recomendada

Usar **Capacitor** sobre la app React.

## Ventajas

- reutilizas el frontend actual
- reduces tiempo de desarrollo
- puedes publicar en Android e iOS con menos friccion

---

## 3.2 Proceso recomendado

### Fase 1 - preparar web responsive

- asegurar layout movil
- revisar formularios
- revisar popovers/dropdowns/date pickers
- revisar performance en pantallas pequeñas

### Fase 2 - integrar Capacitor

Pasos recomendados:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

Despues:

```bash
npx cap add android
npx cap add ios
```

### Fase 3 - sincronizar build web con nativo

```bash
npm run build
npx cap sync
```

### Fase 4 - abrir proyectos nativos

```bash
npx cap open android
npx cap open ios
```

---

## 3.3 Checklist antes de beta movil

- [ ] navegacion inferior o lateral adaptada
- [ ] tap targets comodos
- [ ] teclado movil probado
- [ ] scroll probado
- [ ] safe areas revisadas
- [ ] assets de icono y splash listos
- [ ] flujos de login y biblioteca verificados

---

## 3.4 Publicacion en stores

### Android

- generar build firmada
- completar ficha de Google Play
- subir iconos, screenshots y descripcion
- pasar closed testing

### iOS

- configurar proyecto Xcode
- preparar certificados y signing
- subir a TestFlight
- validar beta
- enviar a App Store Review

---

# 4. Riesgos actuales de despliegue

## 4.1 Doble backend

Mientras existan Express y FastAPI con responsabilidades duplicadas, el despliegue se complica.

## 4.2 Persistencia local

- `appdata.json`
- `gametracker.db`

no son una solucion final multiusuario para produccion.

## 4.3 Auth de prototipo

El token actual del servidor Express no es aun auth de produccion.

## 4.4 Dependencia de IGDB

El despliegue debe asegurar:

- secretos correctos
- manejo de errores
- limites o fallos temporales de la API externa

---

# 5. Recomendacion de orden real de trabajo

## Paso 1

Consolidar arquitectura

## Paso 2

Migrar a persistencia real

## Paso 3

Implementar auth real

## Paso 4

Desplegar web en staging

## Paso 5

Publicar web 1.0

## Paso 6

Adaptar a movil con Capacitor

## Paso 7

Publicar en stores

---

# 6. Comandos utiles actuales

## Frontend

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
npm run start
```

## Backend Python

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

# 7. Mantenimiento de este documento

Actualiza este archivo si:

- cambia el proveedor de hosting
- cambia el backend principal
- cambia la estrategia movil
- cambian los pasos de build
- se añade Docker, CI/CD o infraestructura nueva
