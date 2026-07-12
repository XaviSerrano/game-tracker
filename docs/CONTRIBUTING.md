# Contributing Guide

## Objetivo

Este documento explica como colaborar en GameTracker de forma ordenada y consistente.

> Documento vivo: debe actualizarse cuando cambie el flujo de trabajo, la arquitectura o las convenciones del proyecto.

---

## 1. Principios de colaboracion

- Hacer cambios pequeños y entendibles
- Priorizar claridad y mantenibilidad
- No mezclar refactors grandes con cambios funcionales pequeños si no es necesario
- Mantener la documentacion sincronizada con el codigo
- Revisar el impacto del cambio en frontend, backend y datos

---

## 2. Antes de empezar un cambio

Revisa estos documentos:

- `docs/ROADMAP.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/API_OVERVIEW.md`
- `docs/DATA_MODEL.md`
- `docs/DEPLOYMENT.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/CHANGELOG.md`

Esto ayuda a entender:

- donde debe vivir el cambio
- si afecta a API o modelo de datos
- si hay deuda tecnica relacionada
- si ya existe una decision previa de arquitectura

---

## 3. Flujo de trabajo recomendado

### Paso 1

Entender el cambio antes de tocar codigo.

### Paso 2

Identificar si afecta a:

- UI
- API Express
- backend FastAPI
- modelo de datos
- despliegue
- documentacion

### Paso 3

Implementar el cambio de forma acotada.

### Paso 4

Validar lo necesario:

- `npm run lint`
- `npm run build`
- pruebas manuales del flujo afectado

### Paso 5

Actualizar documentacion relacionada si cambia:

- estructura
- endpoints
- entidades
- decisiones tecnicas
- roadmap
- despliegue

### Paso 6

Registrar el cambio en:

- `docs/CHANGELOG.md`

si el cambio es funcional o relevante tecnicamente.

---

## 4. Convenciones por tipo de cambio

## 4.1 Cambios de frontend

Si el cambio afecta a vistas o componentes:

- revisar `frontend/src/components/`
- revisar `frontend/src/types.ts`
- revisar `frontend/src/App.tsx` si afecta a navegacion

Actualizar documentacion si:

- aparece una nueva vista
- cambia un flujo principal del usuario
- se crea un componente estructural reutilizable importante

---

## 4.2 Cambios de API

Si el cambio afecta a endpoints:

- actualizar el codigo
- revisar componentes consumidores
- actualizar `docs/API_OVERVIEW.md`

Ejemplos:

- nueva ruta
- cambio de request body
- cambio de response
- nueva autenticacion requerida

---

## 4.3 Cambios de modelo de datos

Si cambian entidades, campos o relaciones:

- actualizar implementacion correspondiente
- revisar persistencia afectada
- actualizar `docs/DATA_MODEL.md`

Ejemplos:

- nuevo campo en `UserGame`
- nueva tabla
- cambio de clave logica
- nueva relacion entre usuarios y listas

---

## 4.4 Cambios de arquitectura

Si el cambio modifica como se reparte la responsabilidad entre capas:

- actualizar `docs/PROJECT_STRUCTURE.md`
- actualizar `docs/ARCHITECTURE_DECISIONS.md`

Ejemplos:

- mover logica de Express a FastAPI
- eliminar duplicidad entre backends
- introducir una nueva capa de servicios

---

## 4.5 Cambios de despliegue

Si cambian hosting, build o release:

- actualizar `docs/DEPLOYMENT.md`

Ejemplos:

- nuevo proveedor
- Docker
- CI/CD
- cambio en variables de entorno
- nueva estrategia movil

---

## 5. Criterios minimos antes de cerrar un cambio

- [ ] El cambio resuelve el problema solicitado
- [ ] No rompe el flujo existente
- [ ] El codigo sigue el estilo general del proyecto
- [ ] Se ha validado el impacto principal
- [ ] La documentacion afectada esta actualizada
- [ ] Si aplica, se ha añadido una entrada al changelog

---

## 6. Como mantener la documentacion viva

Regla general:

Si un cambio hace que otra persona tenga que preguntar:

- "donde esta esto?"
- "como funciona esto ahora?"
- "que endpoint devuelve esto?"
- "cual es la fuente de verdad?"

entonces la documentacion debe actualizarse en el mismo cambio.

---

## 7. Orden recomendado de lectura para nuevos colaboradores

1. `docs/PROJECT_STRUCTURE.md`
2. `docs/API_OVERVIEW.md`
3. `docs/DATA_MODEL.md`
4. `docs/ROADMAP.md`
5. `docs/DEPLOYMENT.md`
6. `docs/ARCHITECTURE_DECISIONS.md`
7. `docs/CHANGELOG.md`

---

## 8. Nota final

GameTracker esta todavia evolucionando en arquitectura.  
Por eso, colaborar bien aqui no es solo escribir codigo: tambien implica dejar claro **donde vive cada responsabilidad** y **como evoluciona el proyecto**.
