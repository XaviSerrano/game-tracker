# GameTracker Roadmap

## Objetivo

Llevar GameTracker desde su estado actual de prototipo funcional hasta:

1. **Publicacion web estable**
2. **Publicacion como aplicacion movil**

Este roadmap esta pensado para ejecutarse por fases, con entregables claros y dependencias entre bloques.

---

## Estado actual resumido

Hoy el proyecto ya tiene una buena base visual y funcional:

- Frontend en **React + Vite**
- Servidor Node/Express en `frontend/server.ts`
- Backend FastAPI en `backend/`
- Integracion con **IGDB/Twitch**
- Biblioteca de juegos, reviews, listas, perfil, feed y estadisticas
- Persistencia local/prototipo en parte del sistema

Antes de publicar, hay que convertir esta base en un producto consistente, seguro y mantenible.

---

## Principios del roadmap

- Priorizar primero la **version web**
- Reutilizar al maximo el trabajo del frontend actual para la app movil
- Reducir codigo duplicado y flujos provisionales antes de escalar
- Llegar a publicacion con una base minima pero solida

---

## Fase 0 - Definir arquitectura final

### Objetivo
Cerrar decisiones tecnicas que afectan a todo lo demas.

### Tareas

- [ ] Decidir cual sera el backend principal en produccion:
  - opcion A: mantener **Express** como backend principal
  - opcion B: migrar todo a **FastAPI**
  - opcion C: separar claramente frontend web y API backend
- [ ] Eliminar o planificar la eliminacion de rutas duplicadas entre `frontend/server.ts` y `backend/`
- [ ] Definir la base de datos final de produccion:
  - desarrollo local: SQLite
  - produccion: PostgreSQL recomendado
- [ ] Definir proveedor de hosting:
  - frontend: Vercel / Netlify / servidor propio
  - backend/API: Render / Railway / Fly.io / VPS
- [ ] Definir estrategia movil recomendada
  - **Recomendacion:** usar **Capacitor** para empaquetar la app React actual como app movil

### Entregable

- Arquitectura objetivo documentada
- Decision clara sobre backend, base de datos y despliegue

---

## Fase 1 - Consolidar el producto minimo publicable

### Objetivo
Que todas las funciones clave funcionen bien de punta a punta.

### Tareas funcionales

- [ ] Revisar y cerrar flujo de autenticacion real
- [ ] Revisar biblioteca:
  - estados
  - ratings
  - fechas
  - horas jugadas
  - notas
- [ ] Revisar reviews:
  - crear
  - listar
  - likes
  - coherencia con rating
- [ ] Revisar listas personalizadas:
  - crear
  - editar
  - borrar
  - anadir/eliminar juegos
- [ ] Revisar feed social y perfiles
- [ ] Revisar estadisticas para asegurar datos coherentes
- [ ] Validar buscador y detalle de juegos con IGDB

### Tareas UX/UI

- [ ] Unificar componentes visuales reutilizables:
  - dropdowns
  - date pickers
  - badges
  - estados vacios
  - mensajes de error/exito
- [ ] Mejorar responsive en movil y tablet
- [ ] Revisar accesibilidad basica:
  - foco visible
  - contraste
  - labels
  - navegacion por teclado

### Entregable

- MVP web coherente y usable sin flujos rotos

---

## Fase 2 - Sustituir datos mock por datos reales

### Objetivo
Salir de la logica de demo y pasar a persistencia y usuarios reales.

### Tareas

- [ ] Eliminar cuentas seed como mecanismo principal de acceso
- [ ] Implementar autenticacion real:
  - email + password
  - o login social
- [ ] Guardar usuarios en base de datos real
- [ ] Persistir de forma real:
  - biblioteca
  - ratings
  - reviews
  - listas
  - follows
  - actividad
- [ ] Definir migraciones de base de datos
- [ ] Crear seeds opcionales solo para desarrollo

### Recomendacion

Si se mantiene SQLite para local, preparar desde esta fase la compatibilidad con **PostgreSQL** para produccion.

### Entregable

- App funcionando con usuarios y datos reales

---

## Fase 3 - Seguridad, calidad y robustez

### Objetivo
Preparar la app para uso real y no solo pruebas locales.

### Tareas

- [ ] Validar inputs en frontend y backend
- [ ] Proteger endpoints autenticados
- [ ] Revisar CORS para produccion
- [ ] Gestion segura de secretos y variables de entorno
- [ ] Limitar errores expuestos al cliente
- [ ] Crear pagina/flujo de errores amigable
- [ ] Implementar logs utiles para backend
- [ ] Definir backups de base de datos

### Testing minimo recomendado

- [ ] Tests unitarios de logica critica
- [ ] Tests de API para rutas clave
- [ ] Tests de componentes o flujos esenciales
- [ ] Smoke test manual completo antes de cada release

### Entregable

- Base mas estable, segura y mantenible

---

## Fase 4 - Preparacion para publicacion web

### Objetivo
Dejar lista la aplicacion para salir a internet.

### Infraestructura

- [ ] Configurar entornos:
  - local
  - staging
  - production
- [ ] Configurar dominio
- [ ] Configurar HTTPS
- [ ] Configurar despliegue automatico desde GitHub
- [ ] Configurar variables de entorno en hosting
- [ ] Configurar base de datos de produccion

### Observabilidad

- [ ] Error tracking (Sentry recomendado)
- [ ] Analytics basicos
- [ ] Logs de servidor accesibles
- [ ] Monitorizacion de uptime

### SEO y presentacion web

- [ ] Ajustar title, description y favicon
- [ ] Open Graph / Twitter cards
- [ ] Pagina landing o pantalla inicial mas cuidada
- [ ] Politica de privacidad
- [ ] Terminos de uso

### Entregable

- Entorno staging y entorno production listos

---

## Fase 5 - Lanzamiento web

### Checklist de salida

- [ ] Build de produccion estable
- [ ] Lint y tests verdes
- [ ] Revisión completa responsive
- [ ] Revisión de rendimiento
- [ ] Revisión de errores de consola
- [ ] Revisión de rutas protegidas
- [ ] Revisión de base de datos y backups
- [ ] Publicar version 1.0 web

### Post-lanzamiento inmediato

- [ ] Recoger feedback de usuarios
- [ ] Corregir bugs de primera semana
- [ ] Priorizar mejoras de retencion

### Entregable

- **GameTracker Web 1.0 publicada**

---

## Fase 6 - Adaptacion para movil

### Objetivo
Preparar la app para empaquetarse y sentirse como app movil real.

### Recomendacion tecnica

Usar **Capacitor** sobre la app React actual para acelerar la salida movil.

### Tareas de adaptacion

- [ ] Mejorar toda la navegacion movil
- [ ] Revisar espaciados, tap targets y headers
- [ ] Revisar modales, dropdowns y date pickers en pantallas pequenas
- [ ] Revisar rendimiento en dispositivos medios
- [ ] Revisar formularios y teclado movil
- [ ] Revisar scroll, safe areas y comportamiento en iOS/Android
- [ ] Preparar iconos, splash y nombre de app

### Integraciones nativas posibles

- [ ] Notificaciones push
- [ ] Deep links
- [ ] Compartir contenido
- [ ] Almacenamiento local/offline basico

### Entregable

- App web adaptada para empaquetado movil

---

## Fase 7 - Preparacion para stores

### Objetivo
Cumplir los requisitos de App Store y Google Play.

### Tareas

- [ ] Crear proyecto Capacitor
- [ ] Generar build Android
- [ ] Generar build iOS
- [ ] Probar en dispositivo real
- [ ] Configurar iconos y splash oficiales
- [ ] Crear capturas de pantalla
- [ ] Redactar descripcion comercial
- [ ] Preparar politica de privacidad y soporte
- [ ] Definir clasificacion por edad
- [ ] Revisar permisos solicitados

### Distribucion

- [ ] Publicacion beta interna
- [ ] TestFlight en iOS
- [ ] Closed testing en Google Play
- [ ] Corregir feedback de beta

### Entregable

- Builds listas para enviar a stores

---

## Fase 8 - Lanzamiento movil

### Checklist final

- [ ] Validacion final en iPhone y Android
- [ ] Revisar login, biblioteca, reviews y listas en movil
- [ ] Revisar notificaciones si se implementan
- [ ] Revisar estabilidad offline/online
- [ ] Enviar a App Store
- [ ] Enviar a Google Play
- [ ] Preparar canal de soporte post-lanzamiento

### Entregable

- **GameTracker Mobile publicada**

---

## Priorizacion sugerida

### Prioridad alta

1. Cerrar arquitectura final
2. Pasar de mock/seeds a usuarios y datos reales
3. Consolidar backend y base de datos
4. Publicar version web

### Prioridad media

5. Observabilidad, analytics y SEO
6. Mejoras de UX y responsive completas
7. Adaptacion para movil con Capacitor

### Prioridad baja

8. Features avanzadas:
   - recomendaciones mas inteligentes
   - push notifications
   - modo offline
   - social avanzado

---

## Roadmap resumido por hitos

### Hito 1 - Beta privada web

- Arquitectura decidida
- Auth real
- Base de datos real
- Funciones core estables

### Hito 2 - Web publica 1.0

- Deploy production
- Dominio
- Monitoring
- Legal basico

### Hito 3 - Beta movil

- UI movil pulida
- Build Android/iOS
- Testing real en dispositivos

### Hito 4 - App publicada

- Publicacion en Google Play
- Publicacion en App Store

---

## Propuesta de orden de ejecucion

1. **Arquitectura y backend final**
2. **Autenticacion + base de datos real**
3. **Estabilizacion funcional**
4. **QA + seguridad + despliegue staging**
5. **Publicacion web**
6. **Adaptacion movil**
7. **Publicacion en stores**

---

## Nota final

La mejor estrategia para este proyecto es:

- **cerrar primero una muy buena version web**
- y despues **empaquetar/adaptar esa base a movil**

Asi reduces complejidad, reutilizas la mayor parte del frontend actual y llegas antes a una primera publicacion real.
