# Rediseño 2026-09 — notas de despliegue

Sitio estático sin build ni claves (igual que antes). Subir todo el contenido de
este paquete a la raíz del repo, sustituyendo `index.html`, `app.js` y los JSON.

## Qué cambia
- `index.html` / `app.js` / `styles.css`: rediseño buscador-primero (mapa en pestaña),
  portado del prototipo aprobado. Mismos JSON y misma semántica de datos.
- `vendor/leaflet.js` + `vendor/leaflet.css`: Leaflet 1.9.4 vendorizado (antes CDN unpkg).
- `fonts/pjs-var.woff2`: Plus Jakarta Sans variable (OFL), autoalojada.
- Tiles del mapa: Esri World Light Gray (base + etiquetas), sin marca de agua, con
  atribución ya incluida. Para volver a OSM estándar hay una línea comentada en app.js.
- Deep links nuevos: `?local=<id>` abre la ficha de un local directamente.
  Se conservan `vista|q|tipos|precios|act|vmin|rmin|jmin|gmin|orden|juego|cerveza|tab|lat|lng|z`.

## SEO
- Metas ES, Open Graph/Twitter (`og-image.png`), canonical, JSON-LD (WebSite +
  ItemList de los 42 bares de juegos) inyectado entre `<!--JSONLD-START/END-->`.
- `robots.txt`, `sitemap.xml` (107 URLs).
- Páginas estáticas long-tail: `ciudad/<slug>/` (55), `juego/<slug>/` (23),
  `cerveza/<slug>/` (25) + índices. Enlazan a la app con `?local=`, `?juego=`, `?cerveza=`.

## Tras actualizar datos
`python3 generar-seo.py` regenera JSON-LD, sitemap y las páginas estáticas.
Revisar `og-image.png` solo si cambia la marca.
