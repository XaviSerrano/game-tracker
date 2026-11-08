# Architecture Decisions

## Objetivo

Este documento registra decisiones de arquitectura del proyecto para que no se pierda el contexto tecnico con el tiempo.

> Documento vivo: cada decision relevante debe añadirse como una nueva entrada, no sobrescribiendo decisiones pasadas salvo correcciones claras.

---

## Como usar este documento

Cada decision debe incluir:

- fecha
- estado
- contexto
- decision
- impacto
- siguientes pasos si aplica

### Estados recomendados

- `accepted`
- `proposed`
- `deprecated`
- `superseded`

---

## ADR-001 - Convivencia temporal de Express y FastAPI

- **Fecha:** 2026-07-11
- **Estado:** superseded by ADR-005

### Contexto

El proyecto actualmente dispone de:

- un servidor Express dentro de `frontend/server.ts`
- un backend FastAPI en `backend/app`

La mayor parte de la funcionalidad consumida por la app React vive hoy en Express, mientras que FastAPI cubre una parte menor del dominio.

### Decision

Se documenta explicitamente que, por ahora, ambas capas conviven en paralelo mientras se define la arquitectura final.

### Impacto

- hay duplicidad de responsabilidades
- la documentacion debe dejar claro que backend usa cada flujo
- antes de produccion debera consolidarse una estrategia unica o bien separada con claridad

### Siguientes pasos

- decidir backend principal de produccion
- reducir rutas duplicadas

---

## ADR-005 - Express como backend único

- **Fecha:** 2026-11-08
- **Estado:** accepted

### Contexto

La aplicación principal ya usa Express para autenticación, sesiones, dominio y
PostgreSQL. FastAPI mantenía una implementación parcial de IGDB y una base
SQLite independiente, sin consumidores propios identificados en el frontend.

### Decisión

- Mantener Express como única API y PostgreSQL como única base de datos activa.
- Mantener una única integración IGDB en `backend/src/services/igdb.ts`.
- Desplegar la SPA estática en Vercel y la API en Render.
- Compartir contratos TypeScript mediante `shared/types.ts`.
- Preservar archivos locales heredados hasta confirmar si deben archivarse o
  eliminarse.

### Impacto

- Vite ejecuta como servidor frontend independiente y su proxy de desarrollo
  apunta al backend Express.
- La API sigue usando URLs relativas; Vercel reescribe `/api/*` al backend para
  conservar el flujo de sesión existente.
- El código FastAPI y sus dependencias dejan de formar parte del despliegue.

## ADR-002 - Fuente de verdad unica para rating de juegos

- **Fecha:** 2026-07-11
- **Estado:** accepted

### Contexto

El detalle del juego y la publicacion de reviews permitian manejar valoraciones separadas, lo que generaba incoherencia.

### Decision

El rating del usuario debe tener una unica fuente de verdad:

- `UserGame.rating`

Las reviews leen y reflejan esa valoracion en vez de mantener una puntuacion independiente.

### Impacto

- consistencia entre tracking y review
- menor confusion de UX
- menor riesgo de desincronizacion

---

## ADR-003 - DatePicker propio reutilizable

- **Fecha:** 2026-07-11
- **Estado:** accepted

### Contexto

Se necesitaba una experiencia de fecha mas visual que el input nativo y, ademas, con posibilidad de escritura manual.

### Decision

Se implementa un componente propio:

- `frontend/src/components/DatePicker.tsx`

con:

- calendario desplegable
- seleccion de dia
- escritura manual
- boton de hoy
- boton de limpiar

### Impacto

- mejora de UX
- componente reutilizable en futuras pantallas
- mayor control visual sobre el diseño

---

## ADR-004 - Documentacion centralizada en `docs/`

- **Fecha:** 2026-07-11
- **Estado:** accepted

### Contexto

La documentacion comenzo a crecer y ya no era conveniente mantenerla dispersa o mezclada en la raiz.

### Decision

Centralizar la documentacion del proyecto en:

- `docs/`

### Impacto

- estructura mas limpia
- acceso mas claro a documentacion funcional y tecnica
- mejor mantenibilidad a medida que crece el proyecto

---

## ADR-005 - Estrategia movil recomendada con Capacitor

- **Fecha:** 2026-07-11
- **Estado:** proposed

### Contexto

El proyecto ya tiene una base React funcional y una futura salida movil es parte del roadmap.

### Decision

La recomendacion actual es reutilizar la app React y empaquetarla con:

- **Capacitor**

antes de plantear una app nativa o React Native separada.

### Impacto

- menor coste de salida a movil
- mayor reutilizacion del frontend actual
- release movil potencialmente mas rapido

### Pendiente

- validar rendimiento
- validar necesidades nativas reales
- confirmar que la UX movil cumple expectativas

---

## Plantilla para nuevas decisiones

```md
## ADR-XXX - Titulo

- **Fecha:** YYYY-MM-DD
- **Estado:** proposed|accepted|deprecated|superseded

### Contexto
...

### Decision
...

### Impacto
...

### Siguientes pasos
...
```
