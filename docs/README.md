# Documentación de GameTracker

## Objetivo

Este directorio centraliza la documentacion funcional y tecnica del proyecto.

Si estas empezando a trabajar en GameTracker, este archivo es el mejor punto de entrada.

---

## Orden recomendado de lectura

### 1. Vision general del proyecto

- [ROADMAP.md](./ROADMAP.md)
  - roadmap del producto hasta publicacion web y movil

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
  - estructura del repositorio, carpetas y responsabilidades

### 2. Entender como funciona hoy

- [API_OVERVIEW.md](./API_OVERVIEW.md)
  - endpoints actuales, capas API y responsabilidades

- [DATA_MODEL.md](./DATA_MODEL.md)
  - entidades, relaciones y fuentes de verdad del modelo de datos

### 3. Entender decisiones tecnicas

- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)
  - registro de decisiones de arquitectura (ADR)

### 4. Colaborar y mantener el proyecto

- [CONTRIBUTING.md](./CONTRIBUTING.md)
  - flujo recomendado para contribuir y mantener consistencia

- [CHANGELOG.md](./CHANGELOG.md)
  - historial de cambios relevantes

### 5. Publicar y desplegar

- [DEPLOYMENT.md](./DEPLOYMENT.md)
  - estrategia y pasos de despliegue web y movil

---

## Mapa rápido de documentos

| Documento | Para qué sirve |
|---|---|
| `ROADMAP.md` | Define el plan de evolucion del producto |
| `PROJECT_STRUCTURE.md` | Explica la estructura del repositorio |
| `API_OVERVIEW.md` | Resume las APIs actuales |
| `DATA_MODEL.md` | Describe entidades y relaciones |
| `ARCHITECTURE_DECISIONS.md` | Guarda decisiones tecnicas relevantes |
| `CONTRIBUTING.md` | Explica como colaborar |
| `CHANGELOG.md` | Registra cambios importantes |
| `DEPLOYMENT.md` | Describe como desplegar web y movil |

---

## Cuándo actualizar esta documentación

Actualiza uno o varios de estos archivos cuando cambie cualquiera de estos aspectos:

- estructura del proyecto
- endpoints
- entidades o persistencia
- decisiones tecnicas relevantes
- estrategia de despliegue
- roadmap del producto

### Regla simple

Si un cambio afecta a como otra persona entiende, usa o despliega el proyecto, la documentacion debe actualizarse en el mismo cambio.

---

## Recomendación práctica

Cuando hagas una feature nueva, revisa al final si debes tocar alguno de estos archivos:

- `PROJECT_STRUCTURE.md`
- `API_OVERVIEW.md`
- `DATA_MODEL.md`
- `ARCHITECTURE_DECISIONS.md`
- `CHANGELOG.md`

---

## Nota final

El objetivo de esta carpeta no es solo guardar texto, sino mantener una **documentacion viva y util** que evolucione junto con GameTracker.
