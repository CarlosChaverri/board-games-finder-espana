# 🎲 Board Games Finder España

Mapa web de bares, cafés y pubs de **juegos de mesa en España**: explora el mapa, filtra por precio, valoración o número de juegos, y busca un juego concreto (p. ej. *Catán*) para ver en qué locales está disponible.

**Web:** https://carloschaverri.github.io/board-games-finder-madrid/

## Estructura

- `index.html` — estructura y estilos de la web (Leaflet + OpenStreetMap, sin build ni claves).
- `app.js` — lógica: mapa, filtros, buscador de juegos, ordenación ponderada y estado en la URL.
- `bares.json` — **datos de los locales** (editar aquí para añadir o actualizar bares).
- `juegos.json` — catálogo unificado de juegos por local, generado a partir de los catálogos web oficiales.

## Añadir o actualizar un bar

Edita `bares.json` y añade un objeto con este formato:

```json
{
  "id": "slug-unico",
  "nombre": "Nombre del local",
  "tipo": "cafe-juegos",
  "zona": "Barrio o zona",
  "distrito": "Ciudad",
  "ciudad": "Ciudad",
  "direccion": "Calle y número",
  "lat": 40.42, "lng": -3.70,
  "valoracion": 4.5, "resenas": 800,
  "precio": "cover",
  "precio_detalle": "4 €/persona",
  "precio_evidencia": "confirmado",
  "num_juegos": 300, "num_juegos_fuente": "catalogo-web",
  "tipos_juego": ["estrategia", "party"],
  "ambiente": ["grupos"],
  "descripcion": "Texto corto.",
  "web": "https://...",
  "maps_url": "https://www.google.com/maps/search/?api=1&query=...&query_place_id=...",
  "actualizado": "2026-09-11"
}
```

- `tipo`: `cafe-juegos`, `bar-juegos`, `cafe-con-juegos`, `pub-con-juegos`, `gaming-bar`, `chess-bar`, `club`.
- `precio`: `gratis`, `consumicion`, `cover`, `club`, `desconocido`.
- `precio_evidencia` / `num_juegos_fuente`: `confirmado`, `catalogo-web`, `estimado`, `desconocido`, `sin-catalogo`. La web distingue visualmente los datos confirmados de los estimados.

## Fuentes y fiabilidad

- Valoración, nº de reseñas, dirección y enlace a Google Maps: Google Maps/Places (septiembre 2026).
- Catálogos de juegos: webs oficiales de Replay Boardgame Cafe (~1.820 juegos), Six Board Game Cafe (585) y El Bardo Borracho (56), extraídos el 11/09/2026. El resto de locales no publica catálogo.
- Números de juegos de prensa local (Queimada, Archivo Arcano, Txoko Tabulo) marcados como *estimados*.
- Los campos con evidencia débil se marcan como *estimados* en la propia web.
