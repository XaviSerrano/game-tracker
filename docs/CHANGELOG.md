# Changelog

Todos los cambios relevantes del proyecto deben registrarse aqui.

El formato es simple y humano: agrupado por fecha, con resumen funcional y tecnico.

> Documento vivo: actualizar en cambios que afecten comportamiento, arquitectura, datos, UX o documentacion importante.

---

## [Unreleased]

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
