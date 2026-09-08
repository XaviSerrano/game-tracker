# GameTracker --- Guía de implementación de UX, SEO, confianza y cumplimiento

**Proyecto:** GameTracker\
**Stack:** React (frontend) + Node/Express (backend) + IGDB API +
PostgreSQL como objetivo de producción\
**Objetivo del documento:** servir como especificación técnica y de
producto para el agente IA que desarrolla GameTracker.

> **Importante:** esta guía adapta 19 conceptos generales de
> UX/SEO/conversión a un producto web de videojuegos. Algunos conceptos
> de la lista original están pensados para negocios locales o webs
> corporativas. En esos casos se explica si deben implementarse,
> adaptarse o descartarse. No se deben implementar elementos
> artificiales solo para "cumplir una checklist".

------------------------------------------------------------------------

## 0. Principios generales

GameTracker debe priorizar:

1.  **Utilidad para el usuario** antes que SEO.
2.  **Contenido real y verificable** antes que contenido generado para
    posicionar.
3.  **URLs rastreables y estables**.
4.  **Accesibilidad**.
5.  **Rendimiento**, especialmente en móvil.
6.  **Privacidad y transparencia**.
7.  **Medición** mediante Search Console, Analytics y métricas de
    rendimiento.
8.  **No inventar reseñas, testimonios, casos de estudio, personas,
    empresas, ubicaciones ni estadísticas.**
9.  **No exponer credenciales de IGDB/Twitch en el frontend.**
10. Las páginas generadas a partir de datos de IGDB deben aportar valor
    propio y no limitarse a copiar datos de una API.

------------------------------------------------------------------------

# 1. Página 404 personalizada

## Qué es

Una página 404 se muestra cuando el servidor recibe una URL que no
existe.

En una SPA React es especialmente importante diferenciar:

-   ruta que React no conoce;
-   recurso que realmente no existe;
-   juego inexistente;
-   página eliminada.

## Objetivo

Evitar que el usuario termine en una página genérica del servidor y
ofrecer una salida clara.

## Implementación recomendada

Crear una ruta React de fallback:

``` jsx
<Route path="*" element={<NotFoundPage />} />
```

La página debería incluir:

-   código visual `404`;
-   mensaje claro;
-   botón "Volver al inicio";
-   acceso a buscar juegos;
-   enlaces a páginas principales;
-   diseño coherente con GameTracker.

Ejemplo conceptual:

``` text
404

No encontramos esta página.

Puede que la URL sea incorrecta o que el contenido ya no exista.

[Buscar un juego] [Ir al inicio]
```

## SEO

La URL inexistente debe devolver realmente un HTTP `404` o `410` cuando
corresponda. En una SPA esto requiere revisar también el
hosting/server-side routing; mostrar visualmente un "404" no sustituye
necesariamente al código HTTP correcto.

## GameTracker

Implementar.

También debe existir un estado específico para:

``` text
/game/slug-inexistente
```

sin convertirlo automáticamente en la página de inicio.

------------------------------------------------------------------------

# 2. CTA antes del scroll

## Qué es

CTA = Call To Action.

Es una acción principal que queremos que el usuario realice.

En GameTracker pueden ser:

-   "Empieza a organizar tus juegos"
-   "Explorar juegos"
-   "Crear cuenta"
-   "Añadir a mi colección"
-   "Descubrir juegos"

## Principio

La parte visible inicialmente ("above the fold") debe explicar:

1.  qué es GameTracker;
2.  qué beneficio obtiene el usuario;
3.  cuál es la acción principal.

## Recomendación

En Home:

``` text
GameTracker

Organiza, descubre y sigue tu colección de videojuegos.

[Explorar juegos] [Crear cuenta]
```

No llenar la primera pantalla de botones. Debe existir un CTA principal.

## GameTracker

Implementar, pero priorizando el valor del producto sobre técnicas
agresivas de conversión.

------------------------------------------------------------------------

# 3. Enlaces internos

## Qué son

Enlaces que conectan páginas dentro de GameTracker.

Google indica que los enlaces rastreables ayudan a descubrir otras
páginas del sitio y que el texto del enlace puede aportar contexto sobre
el contenido.

## Estructura recomendada

Ejemplo:

``` text
Home
 ├── Juegos
 │    ├── RPG
 │    ├── Acción
 │    └── ...
 │
 ├── Trending
 │
 ├── Juego
 │    ├── Reviews
 │    ├── Plataformas
 │    └── Juegos similares
 │
 └── Listas
```

Una página de juego debería enlazar a:

-   género;
-   plataforma;
-   juegos similares;
-   desarrollador;
-   publisher, si existe;
-   reviews;
-   listas relacionadas.

## Buenas prácticas

Usar textos descriptivos:

``` html
<a href="/games/elden-ring">
  Elden Ring
</a>
```

Mejor que:

``` html
<a href="/games/elden-ring">
  Ver más
</a>
```

## GameTracker

Prioridad ALTA.

Esto será especialmente importante para SEO si GameTracker tiene miles
de páginas de juegos.

------------------------------------------------------------------------

# 4. Página de agradecimientos

## Qué es

Página mostrada después de una acción completada:

-   registro;
-   envío de formulario;
-   feedback;
-   contacto;
-   solicitud de eliminación de cuenta.

## Ejemplo

``` text
¡Gracias!

Hemos recibido tu mensaje correctamente.

[Volver a GameTracker]
```

## Importante

No crear una "thank you page" simplemente porque una checklist SEO la
recomienda.

Debe utilizarse cuando existe una acción que realmente termina.

## Analítica

Puede ser útil como punto de conversión para Analytics.

Ejemplo:

``` text
/contact/thanks
```

Pero las páginas de confirmación privadas o puramente transaccionales
normalmente no deberían indexarse.

## GameTracker

Implementar solo para flujos donde tenga sentido.

------------------------------------------------------------------------

# 5. Migas de pan / Breadcrumbs

## Qué son

Indican al usuario dónde está:

``` text
Inicio > Juegos > RPG > Elden Ring
```

## Beneficios

-   orientación;
-   navegación;
-   jerarquía;
-   enlaces internos;
-   contexto semántico.

Google permite utilizar `BreadcrumbList` structured data para ayudar a
comprender la jerarquía.

Importante: Google actualizó su documentación indicando que las
breadcrumbs pueden aparecer en resultados de escritorio, pero no en
resultados móviles.

## Implementación

UI:

``` text
Inicio / Juegos / RPG / Elden Ring
```

Structured data:

``` json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Inicio",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Juegos",
      "item": "https://example.com/games"
    }
  ]
}
```

## GameTracker

Implementar en páginas profundas:

-   juego;
-   género;
-   plataforma;
-   listas;
-   artículos si se crean.

------------------------------------------------------------------------

# 6. Casos de estudio

## Qué son

Contenido que demuestra cómo se ha utilizado un producto, servicio o
metodología y qué resultado produjo.

Ejemplo corporativo:

> "Cómo una empresa organizó 20.000 productos con nuestra plataforma."

## Problema para GameTracker

GameTracker es un producto propio y no debe inventar clientes.

## Adaptación

Podemos convertir este concepto en contenido editorial real:

-   "Cómo organizamos nuestro backlog con GameTracker"
-   "Cómo funciona el sistema de colección"
-   "Cómo construimos el catálogo a partir de IGDB"
-   "Cómo diseñamos el sistema de recomendaciones"
-   experiencias de usuarios reales, si se dispone de consentimiento y
    datos reales.

## Regla

No inventar:

-   clientes;
-   resultados;
-   porcentajes;
-   testimonios.

## GameTracker

Implementar solo cuando haya material real.

------------------------------------------------------------------------

# 7. FAQs

## Qué son

Preguntas frecuentes que resuelven dudas reales.

Ejemplos:

``` text
¿Es gratis GameTracker?
¿Necesito crear una cuenta?
¿De dónde proceden los datos de los juegos?
¿Puedo importar mi colección?
¿Puedo eliminar mi cuenta?
¿Cómo funcionan las valoraciones?
```

## SEO actual

Las FAQ siguen siendo útiles para usuarios y para cubrir intención de
búsqueda, pero NO debe implementarse FAQ structured data esperando
necesariamente un rich result.

Google retiró los FAQ rich results de la Búsqueda en mayo de 2026.

## Implementación

Componente accesible:

``` html
<details>
  <summary>¿De dónde proceden los datos?</summary>
  <p>...</p>
</details>
```

o acordeón accesible equivalente.

## GameTracker

Implementar.

Priorizar preguntas que realmente reciben los usuarios.

------------------------------------------------------------------------

# 8. Compromiso con el tiempo de respuesta

## Qué es

Informar de forma explícita cuánto suele tardarse en responder a una
solicitud.

Ejemplo:

> "Respondemos normalmente en menos de 48 horas."

## Importante

Solo debe publicarse si podemos cumplirlo.

No prometer:

> "Respuesta en 1 hora"

si no existe capacidad real para hacerlo.

## GameTracker

En una aplicación personal:

``` text
Contacto

Normalmente respondemos en un plazo de 48-72 horas.
```

Si el proyecto no dispone de soporte formal, puede omitirse.

## Implementación adicional

Si se incorpora:

-   email de contacto;
-   formulario;
-   sistema de feedback;

mostrar expectativas realistas.

------------------------------------------------------------------------

# 9. CTA fijo en móvil

## Qué es

Un CTA persistente en la parte inferior de la pantalla.

Ejemplo:

``` text
┌─────────────────────────┐
│                         │
│       contenido         │
│                         │
├─────────────────────────┤
│  + Añadir a colección   │
└─────────────────────────┘
```

## Riesgos

Un CTA fijo puede:

-   tapar contenido;
-   molestar;
-   reducir espacio;
-   interferir con controles;
-   afectar accesibilidad.

## GameTracker

No usar uno global en toda la aplicación.

Usarlo contextualmente en páginas donde exista una acción principal:

``` text
Página de juego
[ + Añadir a colección ]
```

En móvil puede ser sticky si no tapa contenido.

Debe respetar safe areas:

``` css
padding-bottom: env(safe-area-inset-bottom);
```

y debe comprobarse en dispositivos pequeños.

------------------------------------------------------------------------

# 10. robots.txt

## Qué es

Archivo situado en:

``` text
/robots.txt
```

Indica a los crawlers qué URLs pueden solicitar.

Google deja claro que robots.txt sirve principalmente para controlar
rastreo y NO es un mecanismo fiable para impedir que una URL aparezca en
Google.

## GameTracker

Archivo inicial recomendado:

``` txt
User-agent: *
Allow: /

Sitemap: https://TU-DOMINIO.com/sitemap.xml
```

No bloquear:

``` text
/assets/
```

si Google necesita esos recursos para renderizar la página.

## No usar robots.txt para

-   ocultar páginas privadas;
-   ocultar perfiles;
-   sustituir `noindex`;
-   proteger información sensible.

Las páginas privadas deben estar protegidas por
autenticación/autorización.

## GameTracker

Implementar.

------------------------------------------------------------------------

# 11. Títulos únicos para cada página

## Qué es

El elemento:

``` html
<title>...</title>
```

Google recomienda que cada página tenga un título descriptivo y conciso.

## GameTracker

Ejemplos:

``` text
Home:
GameTracker — Organiza tu colección de videojuegos

Juego:
Elden Ring — GameTracker

Género:
Mejores juegos RPG — GameTracker

Plataforma:
Juegos de PS5 — GameTracker
```

No hacer:

``` text
GameTracker
GameTracker
GameTracker
GameTracker
```

para todas las rutas.

## Implementación React

Crear un sistema centralizado de metadata:

``` js
setPageMetadata({
  title: "Elden Ring — GameTracker",
  description: "..."
});
```

Puede utilizarse una librería de metadata si la arquitectura del
proyecto lo requiere.

## Prioridad

MUY ALTA.

------------------------------------------------------------------------

# 12. Metadescripciones

## Qué son

``` html
<meta
  name="description"
  content="..."
/>
```

Google puede utilizar la meta description para crear el snippet, aunque
puede sustituirla por contenido de la página si considera que otro
fragmento es más relevante.

## Regla

Cada página importante debe tener una descripción específica.

Ejemplo:

``` text
Elden Ring — GameTracker

Descubre información, plataformas, valoración, reviews y juegos similares a Elden Ring.
```

No:

``` text
Bienvenido a GameTracker, tu plataforma de videojuegos...
```

en todas las páginas.

## Implementación

Metadata dinámica basada en el juego:

``` js
description = `${game.name}: información, plataformas,
valoraciones, reviews y juegos similares en GameTracker.`;
```

Debe evitarse generar descripciones vacías, duplicadas o engañosas.

------------------------------------------------------------------------

# 13. Imagen para RRSS / Open Graph

## Qué es

Imagen que acompaña al compartir una URL en:

-   WhatsApp;
-   Discord;
-   Facebook;
-   LinkedIn;
-   otras plataformas compatibles.

## Tags recomendados

``` html
<meta property="og:title" content="Elden Ring — GameTracker" />
<meta
  property="og:description"
  content="Descubre Elden Ring en GameTracker."
/>
<meta
  property="og:image"
  content="https://example.com/og/elden-ring.jpg"
/>
<meta property="og:url" content="https://example.com/games/elden-ring" />
<meta property="og:type" content="website" />
```

También:

``` html
<meta name="twitter:card" content="summary_large_image" />
```

## GameTracker

Muy importante porque las páginas de juegos son contenido compartible.

## Estrategia

Generar una imagen social coherente:

``` text
[cover del juego]

ELDEN RING

GameTracker
Track • Rate • Discover
```

No generar una imagen diferente de forma innecesaria para cada request
si tiene un coste elevado. Puede usarse generación dinámica/caché.

------------------------------------------------------------------------

# 14. MAPAS + ".inds"

## Interpretación de este punto

La expresión "MAPAS +.inds" no corresponde a un término estándar
inequívoco de SEO. Para este proyecto se interpreta como **mapas /
información geográfica + posibles indicadores/enlaces**, pero no debe
introducirse un mapa si no existe una necesidad geográfica real.

## Regla para GameTracker

GameTracker NO es un negocio local.

Por tanto:

-   no añadir Google Maps por SEO;
-   no inventar una dirección;
-   no implementar `LocalBusiness` artificialmente;
-   no añadir mapas solo para satisfacer una checklist.

## Dónde sí podría tener sentido

Si en el futuro GameTracker incluye:

``` text
Eventos gaming
Tiendas
Convenciones
LAN parties
Eventos locales
```

entonces sí podría existir:

``` text
/events/barcelona
/events/madrid
```

con mapas y datos geográficos reales.

------------------------------------------------------------------------

# 15. Reseñas reales

## Qué son

Opiniones escritas por usuarios reales.

GameTracker puede tener:

-   reviews de juegos;
-   ratings;
-   comentarios;
-   opiniones sobre juegos.

## Regla crítica

Nunca generar reviews falsas.

No utilizar:

``` text
“Juan — ¡GameTracker es increíble!”
```

si Juan no existe o no ha escrito esa opinión.

## Datos

Una review debería estar asociada a:

``` text
user
game
rating
comment
createdAt
```

## Structured data

Google admite Review/AggregateRating para ciertos tipos, incluido
`Game`, pero deben cumplirse sus directrices.

Las valoraciones deben proceder directamente de usuarios y el marcado
debe representar contenido visible y real.

## GameTracker

Sí implementar reviews reales.

Pero no asumir que añadir schema garantiza estrellas en Google.

------------------------------------------------------------------------

# 16. Textos ALT

## Qué son

Texto alternativo para imágenes.

Ejemplo:

``` html
<img
  src="/elden-ring.jpg"
  alt="Elden Ring"
/>
```

## Accesibilidad

El ALT debe comunicar la función o contenido relevante de la imagen.

No describir inútilmente:

``` text
alt="imagen"
```

Tampoco hacer keyword stuffing:

``` text
alt="Elden Ring mejor juego RPG PS5 videojuegos GameTracker RPG"
```

## Imágenes decorativas

Si una imagen es puramente decorativa:

``` html
alt=""
```

## GameTracker

Especial atención a:

-   covers;
-   avatares;
-   logos;
-   iconos;
-   banners;
-   imágenes de perfil;
-   screenshots.

Ejemplo:

``` html
alt={`${game.name} cover`}
```

Mejor adaptarlo al idioma de la interfaz.

------------------------------------------------------------------------

# 17. Esquema local / LocalBusiness

## Qué es

Structured data para negocios con presencia física o actividad local.

Ejemplos:

``` json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Ejemplo",
  "address": {}
}
```

## GameTracker

NO implementarlo.

GameTracker es una aplicación/plataforma digital, no un negocio local.

No inventar:

-   dirección;
-   horario;
-   teléfono;
-   ubicación;
-   Google Maps.

## Alternativa

Para GameTracker pueden ser más apropiados:

-   `WebSite`;
-   `Organization`;
-   `SoftwareApplication`;
-   `VideoGame` / `Game` cuando corresponda;
-   `BreadcrumbList`;
-   `Review`;
-   `AggregateRating` cuando sea elegible y represente datos reales.

El schema exacto debe validarse según las propiedades soportadas y las
directrices vigentes.

------------------------------------------------------------------------

# 18. Política de privacidad

## Por qué es necesaria

GameTracker puede tratar datos personales:

-   email;
-   nombre de usuario;
-   contraseña almacenada mediante hash;
-   perfil;
-   reviews;
-   follows;
-   datos de sesión;
-   logs;
-   analytics;
-   cookies;
-   datos necesarios para seguridad.

Si se utiliza Analytics u otros terceros, debe explicarse el tratamiento
correspondiente y configurarse el consentimiento cuando sea necesario.

## La política debe explicar como mínimo

-   quién es el responsable;
-   qué datos se recogen;
-   para qué se utilizan;
-   base jurídica;
-   cuánto tiempo se conservan;
-   destinatarios/proveedores;
-   transferencias internacionales cuando proceda;
-   derechos del usuario;
-   cómo ejercerlos;
-   cómo contactar;
-   cookies/tecnologías similares, cuando corresponda.

La AEPD destaca la transparencia, la identificación del responsable,
finalidades, base jurídica, conservación, destinatarios y derechos como
elementos de la información sobre tratamientos.

## GameTracker

Crear:

``` text
/privacy
```

y enlazarla desde el footer.

## Importante

La política debe describir el tratamiento REAL del proyecto.

No copiar una política genérica que diga que se recopilan datos que
GameTracker no recopila.

La configuración legal definitiva debe revisarse con asesoramiento
profesional si el proyecto pasa a operar comercialmente o trata datos de
mayor riesgo.

------------------------------------------------------------------------

# 19. Foto de equipo

## Qué es

Sección que muestra a las personas detrás de una empresa/proyecto.

## GameTracker

No debe inventarse un equipo.

Si el proyecto tiene un único desarrollador:

``` text
Sobre GameTracker

GameTracker es un proyecto personal desarrollado por [nombre].
```

Puede utilizarse una foto real del desarrollador si se desea, pero no es
requisito SEO.

Si en el futuro existe un equipo real:

``` text
Nuestro equipo
[foto real]
[persona]
[rol]
```

## No hacer

No utilizar:

-   fotos stock como si fueran miembros del equipo;
-   personas generadas por IA presentadas como personas reales;
-   cargos ficticios;
-   testimonios ficticios.

------------------------------------------------------------------------

# Arquitectura técnica recomendada

## Metadata

Centralizar metadata por ruta.

Ejemplo:

``` js
const pageMetadata = {
  home: {
    title: "GameTracker — Organiza tu colección de videojuegos",
    description: "..."
  },
  games: {
    title: "Explorar juegos — GameTracker",
    description: "..."
  }
};
```

Para páginas dinámicas:

``` js
function getGameMetadata(game) {
  return {
    title: `${game.name} — GameTracker`,
    description: `Descubre ${game.name}, sus plataformas,
    valoración, reviews y juegos similares en GameTracker.`
  };
}
```

------------------------------------------------------------------------

# Arquitectura SEO de URLs

Preferir:

``` text
/
/games
/games/elden-ring
/games/baldurs-gate-3
/genres/rpg
/platforms/ps5
/trending
```

Evitar URLs poco descriptivas:

``` text
/game?id=82373
/page?x=123
```

Los IDs internos pueden seguir existiendo, pero la URL pública debe ser
estable y semántica cuando sea posible.

------------------------------------------------------------------------

# Sitemap

Crear:

``` text
/sitemap.xml
```

Debe incluir las URLs públicas que queremos que Google descubra.

No incluir:

``` text
/login
/register
/settings
/profile privado
```

si no aportan contenido público indexable.

Para GameTracker, potencialmente incluir:

``` text
/
/games
/games/:slug
/genres/:slug
/platforms/:slug
/trending
```

El sitemap debe mantenerse actualizado.

------------------------------------------------------------------------

# Robots

Base inicial:

``` txt
User-agent: *
Allow: /

Sitemap: https://TU-DOMINIO.com/sitemap.xml
```

No bloquear recursos necesarios para renderizar correctamente las
páginas.

------------------------------------------------------------------------

# Structured Data recomendado

## WebSite

Para describir el sitio.

## Organization

Para describir la entidad/proyecto cuando proceda.

## SoftwareApplication

Puede ser apropiado para describir GameTracker como aplicación de
software, siempre que los datos sean correctos.

## Game / VideoGame

Para páginas de videojuegos, siempre que el vocabulario y las
propiedades utilizados sean válidos.

## BreadcrumbList

Para la jerarquía de navegación.

## Review / AggregateRating

Solo para reviews y ratings reales y cuando se cumplan las directrices.

## NO usar

``` text
LocalBusiness
```

sin una actividad local real.

------------------------------------------------------------------------

# Accesibilidad

Los 19 puntos no deben tratarse solo como SEO.

El desarrollo debe cumplir, en la medida razonable, WCAG 2.2.

Especial atención a:

-   contraste;
-   teclado;
-   foco visible;
-   nombres accesibles;
-   labels de formularios;
-   alt text;
-   botones reales;
-   navegación móvil;
-   tamaño de objetivos táctiles;
-   contenido no oculto por CTAs sticky;
-   mensajes de error comprensibles.

------------------------------------------------------------------------

# Analítica y medición

Instalar y conectar:

## Google Search Console

Para:

-   consultas;
-   impresiones;
-   clics;
-   CTR;
-   posición;
-   indexación;
-   problemas de rastreo.

## Google Analytics

Para:

-   usuarios;
-   sesiones;
-   eventos;
-   conversiones;
-   navegación;
-   adquisición.

Eventos potenciales:

``` text
sign_up
login
game_search
game_view
add_to_collection
remove_from_collection
add_to_wishlist
rate_game
create_review
follow_user
```

## Vercel Speed Insights

Para Core Web Vitals y rendimiento real del frontend si se utiliza
Vercel.

## PageSpeed Insights

Para pruebas de rendimiento y oportunidades de optimización.

------------------------------------------------------------------------

# Checklist final para el agente IA

## Alta prioridad --- implementar

-   [ ] 404 personalizada.
-   [ ] CTA principal visible en Home.
-   [ ] Enlaces internos entre contenido relacionado.
-   [ ] Breadcrumbs donde aporten navegación.
-   [ ] FAQ real y útil.
-   [ ] robots.txt.
-   [ ] títulos únicos.
-   [ ] metadescripciones dinámicas.
-   [ ] Open Graph / imagen social.
-   [ ] ALT correcto en imágenes.
-   [ ] reviews reales.
-   [ ] política de privacidad.
-   [ ] sitemap.xml.
-   [ ] structured data apropiado.
-   [ ] Search Console / Analytics.
-   [ ] revisión de accesibilidad.

## Implementar solo cuando tenga sentido

-   [ ] Página de agradecimiento para flujos que realmente terminen en
    una confirmación.
-   [ ] CTA sticky móvil contextual.
-   [ ] Compromiso de tiempo de respuesta.
-   [ ] Casos de estudio.
-   [ ] Foto del equipo/desarrollador.

## NO implementar artificialmente

-   [ ] Google Maps / LocalBusiness.
-   [ ] dirección física ficticia.
-   [ ] reseñas falsas.
-   [ ] testimonios inventados.
-   [ ] casos de estudio inventados.
-   [ ] equipo ficticio.
-   [ ] FAQ schema esperando rich results.
-   [ ] robots.txt como sustituto de autenticación/noindex.
-   [ ] keyword stuffing en ALT/meta descriptions.
-   [ ] contenido SEO generado sin valor real.

------------------------------------------------------------------------

# Orden de implementación recomendado

### Fase 1 --- Fundamentos técnicos

1.  Rutas públicas estables.
2.  404. 
3.  títulos únicos.
4.  metadescripciones.
5.  sitemap.
6.  robots.txt.
7.  canonicalización.
8.  Open Graph.
9.  ALT.
10. structured data.

### Fase 2 --- Arquitectura de contenido

11. enlaces internos.
12. breadcrumbs.
13. páginas de juegos optimizadas.
14. páginas de géneros/plataformas.
15. FAQ.
16. contenido editorial real.

### Fase 3 --- Conversión/UX

17. CTA Home.
18. CTA contextual móvil.
19. páginas de agradecimiento.
20. feedback/contacto y compromiso de respuesta.

### Fase 4 --- Confianza y legal

21. reviews reales.
22. privacidad.
23. cookies/consentimiento si corresponde.
24. información del proyecto/equipo real.

### Fase 5 --- Medición

25. Google Search Console.
26. Google Analytics.
27. Vercel Speed Insights.
28. PageSpeed Insights.
29. monitorización de errores.

------------------------------------------------------------------------

# Fuentes principales

## Google Search Central

-   Directrices básicas de la Búsqueda de Google:
    https://developers.google.com/search/docs/essentials

-   Títulos:
    https://developers.google.com/search/docs/appearance/title-link

-   Metadescripciones/snippets:
    https://developers.google.com/search/docs/appearance/snippet

-   robots.txt:
    https://developers.google.com/search/docs/crawling-indexing/robots/intro

-   Crear robots.txt:
    https://developers.google.com/crawling/docs/robots-txt/create-robots-txt

-   Especificación robots.txt:
    https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec

-   Breadcrumb structured data:
    https://developers.google.com/search/docs/appearance/structured-data/breadcrumb

-   Review snippet:
    https://developers.google.com/search/docs/appearance/structured-data/review-snippet

-   LocalBusiness structured data:
    https://developers.google.com/search/docs/appearance/structured-data/local-business

-   Actualizaciones de Search:
    https://developers.google.com/search/updates

**Nota de actualidad:** Google retiró en mayo de 2026 el FAQ rich result
de los resultados de búsqueda. Por tanto, las FAQ deben implementarse
principalmente por utilidad para usuarios y contenido, no esperando un
resultado enriquecido.

## Schema.org

-   https://schema.org/
-   https://schema.org/BreadcrumbList
-   https://schema.org/Review
-   https://schema.org/AggregateRating
-   https://schema.org/SoftwareApplication
-   https://schema.org/VideoGame
-   https://schema.org/LocalBusiness

## Open Graph

-   Open Graph protocol: https://ogp.me/

## Accesibilidad

-   W3C Web Accessibility Initiative: https://www.w3.org/WAI/
-   WCAG 2.2: https://www.w3.org/TR/WCAG22/

## Privacidad --- España / UE

-   Agencia Española de Protección de Datos: https://www.aepd.es/
-   Guía de Protección de Datos para el Ciudadano:
    https://www.aepd.es/guias/guia-ciudadano.pdf
-   Guía AEPD de Privacidad desde el Diseño:
    https://www.aepd.es/documento/guia-privacidad-desde-diseno.pdf
-   Reglamento General de Protección de Datos:
    https://eur-lex.europa.eu/eli/reg/2016/679/oj

------------------------------------------------------------------------

# Referencia rápida para el agente IA

Cuando implementes cualquiera de estos elementos en GameTracker:

**SIEMPRE:** - comprobar primero si el elemento tiene sentido para una
plataforma de videojuegos; - reutilizar componentes existentes; - evitar
duplicación; - mantener responsive/mobile-first; - respetar
accesibilidad; - no inventar datos; - no romper rutas existentes; - no
exponer secretos de IGDB; - mantener metadata por página; - comprobar
que las URLs públicas son indexables cuando deben serlo; - comprobar que
las páginas privadas no son indexables; - probar con
Lighthouse/PageSpeed y herramientas de validación de structured data.

**NO:** - implementar LocalBusiness sin negocio local; - inventar
testimonios; - inventar reviews; - inventar equipo; - inventar casos de
estudio; - usar robots.txt para seguridad; - asumir que metadata
garantiza posicionamiento; - asumir que structured data garantiza rich
results; - copiar contenido de IGDB sin aportar valor propio.

**Objetivo final:**

> GameTracker debe ser técnicamente rastreable, rápido, accesible,
> semánticamente claro, útil para usuarios reales, transparente con sus
> datos y preparado para crecer orgánicamente sin recurrir a técnicas
> SEO artificiales.
