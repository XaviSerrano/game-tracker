# Changelog

Todos los cambios relevantes del proyecto deben registrarse aqui.

El formato es simple y humano: agrupado por fecha, con resumen funcional y tecnico.

> Documento vivo: actualizar en cambios que afecten comportamiento, arquitectura, datos, UX o documentacion importante.

---

## [Unreleased]

### Añadido

- Los visitantes pueden abrir y compartir el detalle de los juegos y leer sus
  reseñas sin iniciar sesión. La interfaz mantiene sus controles y solicita
  iniciar sesión o registrarse al intentar realizar acciones personales.

### Cambiado

- Los filtros de Descubrir ofrecen todos los géneros y plataformas de IGDB
  e indican los errores de carga con opción de reintentar.
- Descubrir muestra los juegos populares en una cuadrícula de 15 resultados
  iniciales, con carga de páginas adicionales; búsqueda y filtros no cambian.
- La descripción del juego se muestra completa sin expandirse al pasar el cursor.
- El detalle muestra `--` en las estimaciones de duración que aún no están disponibles.
- Consolidado Express como backend único bajo `backend/src/`; FastAPI y su
  almacén SQLite separado se retiraron del código activo.
- Separado `frontend/` como SPA Vite; se añadió proxy local hacia Express y se
  actualizó Render para construir el backend.
- Centralizados los tipos de dominio en `shared/types.ts` y la integración
  IGDB en el backend Node.

### Añadido

- Carpeta `docs/` para centralizar la documentacion del proyecto
- `docs/ROADMAP.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/API_OVERVIEW.md`
- `docs/DATA_MODEL.md`
- `docs/DEPLOYMENT.md`
- `docs/CONTRIBUTING.md`
- `docs/CHANGELOG.md`
- `docs/ARCHITECTURE_DECISIONS.md`

### Mejorado

- Detalle de juego con selector visual de fecha reutilizable
- El selector de fecha permite elegir dia desde calendario y tambien escribir manualmente
- El estado `PLAYED` habilita la fecha de completado
- El rating del detalle de juego y el de la review ahora usan una unica fuente de verdad
- El selector de "Fase de Progreso" usa un desplegable visual con iconos por estado
- Las plataformas en el detalle de juego muestran badges visuales y logos de marca
- El icono de navegacion de "Descubrir" se cambio a lupa

### Cambiado

- Se elimino la opcion de alternar cuenta desde el sidebar
- La documentacion ya no vive en la raiz, sino en `docs/`

### Corregido

- La busqueda y exploracion de juegos vuelve a devolver resultados de IGDB usando el campo vigente `game_type`
- Los filtros de Descubrir consultan los IDs de género y plataforma de IGDB en vez de comparar nombres locales

### Mejorado

- Descubrir muestra lanzamientos relevantes, próximos juegos, populares y mejor valorados
- La búsqueda admite filtros combinables, paginación y enlaces compartibles mediante parámetros de URL
- Las consultas IGDB se cachean y se serializan para respetar el límite de peticiones del proveedor

---

## Guia de uso

### Cuando añadir una entrada

Registrar cambios cuando:

- cambia un flujo visible para usuario
- cambia la arquitectura
- cambian endpoints
- cambia el modelo de datos
- se introduce una funcionalidad nueva
- se reorganiza documentacion o estructura del proyecto

### Cuando no hace falta

No hace falta registrar:

- correcciones minimas de texto
- cambios internos sin impacto funcional ni arquitectonico
- experimentos descartados que no llegan a integrarse

---

## Plantilla recomendada

```md
## [YYYY-MM-DD]

### Añadido
- ...

### Mejorado
- ...

### Cambiado
- ...

### Corregido
- ...

### Eliminado
- ...
```
