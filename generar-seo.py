#!/usr/bin/env python3
# Capa SEO del sitio, generada a partir de los 4 JSON de datos:
#   - JSON-LD de index.html (entre <!--JSONLD-START--> y <!--JSONLD-END-->)
#   - robots.txt y sitemap.xml
#   - paginas estaticas long-tail: ciudad/<slug>/, juego/<slug>/, cerveza/<slug>/
#     + indices ciudades.html, juegos-populares.html, cervezas-populares.html
# Re-ejecutar tras actualizar los JSON:  python3 generar-seo.py
import json, os, re, unicodedata, datetime, html
from urllib.parse import quote

BASE = 'https://carloschaverri.github.io/board-games-finder-espana/'
ROOT = os.path.dirname(os.path.abspath(__file__))
TODAY = datetime.date.today().isoformat()

def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')
    return s or 'x'

def load(n):
    with open(os.path.join(ROOT, n), encoding='utf-8') as f:
        return json.load(f)

BARES, CERVEZAS, JUEGOS, MARCAS = load('bares.json'), load('cervezas.json'), load('juegos.json'), load('marcas.json')
BY_ID = {b['id']: ('juegos', b) for b in BARES}
BY_ID.update({b['id']: ('cervezas', b) for b in CERVEZAS})

def esc(s): return html.escape(str(s or ''), quote=True)

def localbusiness(b, kind):
    d = {
        '@type': 'BarOrPub',
        'name': b['nombre'],
        'address': {'@type': 'PostalAddress', 'addressLocality': b.get('ciudad', ''),
                    'addressRegion': b.get('zona') or b.get('distrito') or '', 'addressCountry': 'ES',
                    **({'streetAddress': b['direccion']} if b.get('direccion') else {})},
        'url': f'{BASE}?local={b["id"]}',
    }
    if b.get('lat') is not None:
        d['geo'] = {'@type': 'GeoCoordinates', 'latitude': b['lat'], 'longitude': b['lng']}
    if b.get('valoracion'):
        d['aggregateRating'] = {'@type': 'AggregateRating', 'ratingValue': b['valoracion'],
                                'reviewCount': b.get('resenas', 0)}
    return d

def itemlist(items, name):
    return {'@context': 'https://schema.org', '@type': 'ItemList', 'name': name,
            'numberOfItems': len(items),
            'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'item': it}
                                for i, it in enumerate(items)]}

def page(title, desc, canonical, body, extra_head='', depth=0):
    pre = '../' * depth
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canonical}">
<meta name="robots" content="index,follow">
<link rel="icon" href="{pre}apple-touch-icon.png">
<link rel="stylesheet" href="{pre}styles.css">
{extra_head}
</head>
<body>
<div class="static-wrap">
<a class="back" href="{pre}index.html">&larr; Board Games &amp; Craft Beer Finder Espa&ntilde;a</a>
{body}
</div>
</body>
</html>'''

def venue_row(b, kind):
    if kind == 'juegos':
        n = b.get('num_juegos')
        stat = f'{n} juegos' if n is not None else 'catálogo no publicado'
    else:
        if b.get('grifos') is not None: stat = f"{b['grifos']} grifos"
        elif b.get('cervezas_total') is not None: stat = f"~{b['cervezas_total']} referencias"
        else: stat = ''
    rating = f" &#9733; {b['valoracion']} ({b.get('resenas', 0)})" if b.get('valoracion') else ''
    upd = b.get('actualizado', '')
    zona = b.get('zona') or ''
    where = esc(b.get('direccion') or zona or b.get('ciudad', ''))
    bits = ' &middot; '.join(x for x in [where + rating if where else rating.strip(), stat, f'act. {esc(upd)}' if upd else ''] if x)
    return (f'<a class="vrow" href="{BASE}?local={b["id"]}">'
            f'<b>{esc(b["nombre"])}</b><small>{bits}</small></a>')

sitemap_urls = [{'loc': BASE, 'priority': '1.0'}]

# ---------- JSON-LD de index ----------
index_ld = [
    {'@context': 'https://schema.org', '@type': 'WebSite',
     'name': 'Board Games & Craft Beer Finder España', 'url': BASE, 'inLanguage': 'es',
     'description': 'Buscador de bares con juegos de mesa y cervecerías de especialidad en España.'},
    itemlist([localbusiness(b, 'juegos') for b in BARES], 'Bares con juegos de mesa en España'),
]
ld_html = ('<!--JSONLD-START-->\n' + '\n'.join(
    f'<script type="application/ld+json">\n{json.dumps(x, ensure_ascii=False, separators=(",", ":"))}\n</script>'
    for x in index_ld) + '\n<!--JSONLD-END-->')
with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
    idx = f.read()
idx = re.sub(r'<!--JSONLD-START-->.*?<!--JSONLD-END-->', ld_html, idx, flags=re.S)
with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(idx)
print('index.html: JSON-LD inyectado')

# ---------- paginas por ciudad ----------
cities = {}
for b in BARES:
    cities.setdefault(b.get('ciudad') or 'Sin ciudad', {'juegos': [], 'cervezas': []})['juegos'].append(b)
for b in CERVEZAS:
    cities.setdefault(b.get('ciudad') or 'Sin ciudad', {'juegos': [], 'cervezas': []})['cervezas'].append(b)

city_pages = []
os.makedirs(os.path.join(ROOT, 'ciudad'), exist_ok=True)
for city, d in sorted(cities.items()):
    nj, nc = len(d['juegos']), len(d['cervezas'])
    if nj < 1 and nc < 3:
        continue
    sl = slug(city)
    desc_bits = []
    if nj: desc_bits.append(f'{nj} bares con juegos de mesa')
    if nc: desc_bits.append(f'{nc} cervecerías de especialidad')
    desc = f"Bares y locales en {city}: {', '.join(desc_bits)}. Valoraciones, direcciones y fecha de actualización de cada ficha."
    parts = []
    if nj:
        parts.append(f'<h2>Bares con juegos de mesa en {esc(city)}</h2><div class="vlist">'
                     + ''.join(venue_row(b, 'juegos') for b in sorted(d['juegos'], key=lambda x: -(x.get('valoracion') or 0))) + '</div>')
    if nc:
        parts.append(f'<h2>Cervecerías de especialidad en {esc(city)}</h2><div class="vlist">'
                     + ''.join(venue_row(b, 'cerveza') for b in sorted(d['cervezas'], key=lambda x: -(x.get('valoracion') or 0))) + '</div>')
    ld = itemlist([localbusiness(b, 'juegos') for b in d['juegos']] + [localbusiness(b, 'cerveza') for b in d['cervezas']],
                  f'Locales en {city}')
    body = f'<h1>Bares con juegos de mesa y cervecerías en {esc(city)}</h1><p class="lead">{esc(desc)}</p>' + ''.join(parts)
    extra = f'<script type="application/ld+json">\n{json.dumps(ld, ensure_ascii=False, separators=(",", ":"))}\n</script>'
    out = page(f'Bares con juegos de mesa y cervecerías en {city} — Board Games & Craft Beer Finder',
               desc, f'{BASE}ciudad/{sl}/', body, extra, depth=2)
    pdir = os.path.join(ROOT, 'ciudad', sl)
    os.makedirs(pdir, exist_ok=True)
    with open(os.path.join(pdir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(out)
    city_pages.append((city, sl, nj, nc))
    sitemap_urls.append({'loc': f'{BASE}ciudad/{sl}/', 'priority': '0.8'})

# ---------- paginas por juego / cerveza ----------
def ref_pages(kind, items, min_venues=3, top=25):
    ranked = sorted(items, key=lambda it: -len(it.get('bares') or {}))[:top * 2]
    made = []
    sub = 'juego' if kind == 'juegos' else 'cerveza'
    os.makedirs(os.path.join(ROOT, sub), exist_ok=True)
    for it in ranked:
        brefs = it.get('bares') or {}
        if len(brefs) < min_venues or len(made) >= top:
            continue
        venues = [BY_ID[k] for k in brefs.keys() if k in BY_ID]
        if len(venues) < min_venues:
            continue
        name = it['nombre']
        sl = slug(name)
        verb = 'jugar a' if kind == 'juegos' else 'tomar'
        param = 'juego' if kind == 'juegos' else 'cerveza'
        desc = f'Dónde {verb} {name} en España: {len(venues)} bares y locales con {name}, con valoraciones, dirección y fecha de evidencia.'
        rows = ''.join(venue_row(b, k) for k, b in sorted(venues, key=lambda kb: -(kb[1].get('valoracion') or 0)))
        ld = itemlist([localbusiness(b, k) for k, b in venues], f'Dónde {verb} {name}')
        body = (f'<h1>D&oacute;nde {verb} {esc(name)} en Espa&ntilde;a</h1>'
                f'<p class="lead">{esc(desc)} <a href="{BASE}?{param}={quote(name)}">Ver en el mapa interactivo</a>.</p>'
                f'<div class="vlist">{rows}</div>')
        extra = f'<script type="application/ld+json">\n{json.dumps(ld, ensure_ascii=False, separators=(",", ":"))}\n</script>'
        out = page(f'Dónde {verb} {name} — {len(venues)} bares en España', desc,
                   f'{BASE}{sub}/{sl}/', body, extra, depth=2)
        pdir = os.path.join(ROOT, sub, sl)
        os.makedirs(pdir, exist_ok=True)
        with open(os.path.join(pdir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(out)
        made.append((name, sl, len(venues)))
        sitemap_urls.append({'loc': f'{BASE}{sub}/{sl}/', 'priority': '0.7'})
    return made

game_pages = ref_pages('juegos', JUEGOS)
beer_pages = ref_pages('cerveza', MARCAS)

# ---------- indices ----------
def index_page(fname, title, desc, rows):
    out = page(title, desc, f'{BASE}{fname}', f'<h1>{esc(title)}</h1><p class="lead">{esc(desc)}</p><div class="vlist">{rows}</div>')
    with open(os.path.join(ROOT, fname), 'w', encoding='utf-8') as f:
        f.write(out)
    sitemap_urls.append({'loc': f'{BASE}{fname}', 'priority': '0.6'})

index_page('ciudades.html', 'Ciudades con bares de juegos y cervecerías de especialidad',
           f'{len(city_pages)} ciudades con locales verificados en España.',
           ''.join(f'<a class="vrow" href="ciudad/{sl}/"><b>{esc(c)}</b><small>{nj} de juegos &middot; {nc} cervecerías</small></a>'
                   for c, sl, nj, nc in city_pages))
index_page('juegos-populares.html', 'Juegos de mesa más buscados y dónde jugarlos',
           f'Los {len(game_pages)} juegos con más bares en España.',
           ''.join(f'<a class="vrow" href="juego/{sl}/"><b>{esc(n)}</b><small>{c} bares</small></a>'
                   for n, sl, c in game_pages))
index_page('cervezas-populares.html', 'Cervezas de especialidad más buscadas y dónde tomarlas',
           f'Las {len(beer_pages)} cervezas con más locales en España.',
           ''.join(f'<a class="vrow" href="cerveza/{sl}/"><b>{esc(n)}</b><small>{c} locales</small></a>'
                   for n, sl, c in beer_pages))

# ---------- robots + sitemap ----------
with open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8') as f:
    f.write(f'User-agent: *\nAllow: /\n\nSitemap: {BASE}sitemap.xml\n')
sm = ['<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u in sitemap_urls:
    sm.append(f'  <url><loc>{u["loc"]}</loc><lastmod>{TODAY}</lastmod><priority>{u["priority"]}</priority></url>')
sm.append('</urlset>')
with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(sm))
print(f'ciudades: {len(city_pages)} | juegos: {len(game_pages)} | cervezas: {len(beer_pages)} | urls sitemap: {len(sitemap_urls)}')
