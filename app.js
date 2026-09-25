/* ============================================================
   Board Games & Craft Beer Finder España — app.js
   Sitio estático sin build: 4 JSON de datos + Leaflet (vendor).
   Port del rediseño aprobado (buscador primero, mapa en pestaña).
   ============================================================ */
'use strict';

/* ---------- constantes (misma semántica que los JSON) ---------- */
const TIPOS_LOCAL = {
  'cafe-juegos': 'Café de juegos', 'bar-juegos': 'Bar de juegos',
  'cafe-con-juegos': 'Café con juegos', 'pub-con-juegos': 'Pub con juegos',
  'gaming-bar': 'Gaming bar', 'chess-bar': 'Bar de ajedrez', 'club': 'Club asociativo'
};
const PRECIO = {
  gratis: 'Gratis', consumicion: 'Con tu consumición',
  cover: 'Cover (tarifa de juego)', club: 'Cuota de club', desconocido: 'Sin datos'
};
const FUENTE_BADGE = {
  'catalogo-web': ['Confirmado en catálogo web', 'ok'],
  'resenas': ['Mencionado en reseñas', 'warn'],
  'estimado': ['Dato estimado', 'est'],
  'desconocido': ['Sin datos', 'est'],
  'sin-catalogo': ['Catálogo no publicado', 'est']
};
const CERVEZA_TIPOS = {
  'fabrica': 'Fábrica con bar', 'taproom': 'Taproom de cervecera',
  'especializado': 'Bar especializado', 'clasica': 'Clásica de importación',
  'mercado': 'Puesto de mercado', 'irish': 'Irish pub'
};
const CERVEZA_FUENTE = {
  'web-oficial': ['Según su web', 'ok'], 'prensa': ['Según prensa', 'est'], 'perfil': ['Según guía cervecera', 'est']
};
const ACTIVIDADES = { billar: 'Billar', dardos: 'Dardos', musica_en_directo: 'Música en directo' };
const ACT_FUENTE = {
  'web-oficial': ['Según su web', 'ok'], 'untappd': ['Según Untappd', 'mid'],
  'guia': ['Según guía', 'est'], 'resenas': ['Mencionado en reseñas', 'warn'], 'prensa': ['Según prensa', 'est']
};
const CERVEZA_ITEM_BADGE = {
  'carta-actual': ['En carta ahora', 'ok'], 'carta-sin-fecha': ['Carta publicada (sin fecha)', 'est'],
  'menu-externo': ['Menú de Untappd', 'mid'], 'visto-untappd': ['Visto en Untappd', 'warn']
};

/* ---------- datos (se rellenan en init) ---------- */
const DATA = {
  juegos: {
    venues: [], items: [],
    brandIcon: 'dice', brandTitle: 'Board Games Finder España', brandSub: 'Bares y cafés de juegos de mesa en España',
    docTitle: 'Board Games Finder España — Bares de juegos de mesa en España',
    namePlaceholder: 'Filtrar por nombre, ciudad o zona…',
    chipsLabel: 'Precio para jugar', chips: PRECIO,
    chipOrder: { gratis: 0, consumicion: 1, cover: 2, club: 3, desconocido: 4 },
    chipField: 'precio', chipState: 'precios',
    minLabel: 'Nº de juegos', minOptions: [[0, 'Cualquiera'], [50, '50+'], [200, '200+'], [500, '500+'], [1000, '1000+']],
    minField: 'num_juegos', minParam: 'jmin',
    ordenExtra: ['juegos', 'Nº de juegos'], sortField: 'num_juegos',
    searchPlaceholder: 'Busca un juego: Catán, Azul, Pandemic…', bannerLead: 'Bares donde puedes jugar a', urlParam: 'juego',
    itemBadge: FUENTE_BADGE,
    heroTitle: '¿A qué jugamos hoy?',
    heroSub: 'Busca un juego de mesa y descubre en qué bares y cafés de España puedes jugarlo.',
    quickChips: [
      { label: 'Catan', match: 'Catan' }, { label: 'Pandemic', match: 'Pandemic' },
      { label: 'Azul', match: 'Azul' }, { label: 'Carcassonne', match: 'Carcassonne' },
      { label: 'Ticket to Ride', match: 'Ticket to Ride' }, { label: 'Dobble', match: 'Dobble' }
    ]
  },
  cervezas: {
    venues: [], items: [],
    brandIcon: 'pint', brandTitle: 'Craft Beer Finder España', brandSub: 'Cervecerías de especialidad e Irish pubs en España',
    docTitle: 'Craft Beer Finder España — Cervecerías de especialidad e Irish pubs en España',
    namePlaceholder: 'Filtrar por nombre, ciudad o barrio…',
    chipsLabel: 'Tipo de local', chips: CERVEZA_TIPOS,
    chipOrder: { fabrica: 0, taproom: 1, especializado: 2, clasica: 3, mercado: 4, irish: 5 },
    chipField: 'tipo', chipState: 'tipos',
    minLabel: 'Nº de grifos', minOptions: [[0, 'Cualquiera'], [5, '5+'], [10, '10+'], [15, '15+']],
    minField: 'grifos', minParam: 'gmin',
    ordenExtra: ['grifos', 'Nº de grifos'], sortField: 'grifos',
    actChips: ACTIVIDADES,
    searchPlaceholder: 'Busca una cerveza: Guinness, una IPA…', bannerLead: 'Locales donde la tienen', urlParam: 'cerveza',
    itemBadge: CERVEZA_ITEM_BADGE,
    heroTitle: '¿Qué cerveza te apetece?',
    heroSub: 'Busca una cerveza concreta y mira qué bares de España la tienen en carta.',
    quickChips: [
      { label: 'Guinness Draught', match: 'Guinness Draught' }, { label: 'IPA · Tyris', match: 'IPA' },
      { label: '18/70', match: '18/70' }, { label: "Murphy's Irish Red", match: "Murphy's Irish Red" },
      { label: 'Kilkenny', match: 'Kilkenny' }, { label: 'El Águila Sin Filtrar', match: 'El Águila Sin Filtrar' }
    ]
  }
};

/* ---------- iconos ---------- */
const IC = {
  dice: '<rect x="3" y="3" width="18" height="18" rx="4.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>',
  pint: '<path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M5 6h12v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M7 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>',
  pin: '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  sliders: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2.2"/><circle cx="8" cy="16" r="2.2"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>'
};
const icon = (n, s = 16, sw = 2) =>
  `<span class="ic" style="width:${s}px;height:${s}px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg></span>`;

/* ---------- utils ---------- */
const $ = s => document.querySelector(s);
const normTxt = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmtN = n => n == null ? null : n.toLocaleString('es-ES');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmtFecha(f) { if (!f) return null; const [y, m, d] = f.split('-'); return d + '/' + m + '/' + y; }
function score(b, C, m) { return (b.resenas / (b.resenas + m)) * b.valoracion + (m / (b.resenas + m)) * C; }
function badgeFor(fuente, fecha, map) {
  const f = (fuente && map[fuente]) || ['Dato estimado', 'est'];
  const label = (fuente === 'visto-untappd' || fuente === 'resenas')
    ? f[0] + (fecha ? ' · ' + fmtFecha(fecha) : ' · sin fecha')
    : f[0];
  return { label, cls: f[1] };
}
const tipoLabel = (mode, t) => (mode === 'juegos' ? TIPOS_LOCAL[t] : CERVEZA_TIPOS[t]) || t;

/* ---------- estado ---------- */
let mode = 'juegos';
let tab = 'buscar';
const emptyFilters = () => ({ q: '', precios: new Set(), tipos: new Set(), actividades: new Set(), vmin: 0, rmin: 0, nmin: 0, orden: 'relevancia' });
let f = emptyFilters();
let sel = null;              // CatalogItem seleccionado en el buscador
let sheetId = null;
let showFilters = false;
let userLoc = null;
let flyTick = 0;
let mapView = { lat: 40.2, lng: -3.4, z: 6 };
const cfg = () => DATA[mode];

/* ---------- búsqueda en catálogo ---------- */
function itemMatch(it, nq) {
  if (normTxt(it.nombre).includes(nq)) return true;
  if (mode === 'cervezas') return normTxt(it.cervecera || '').includes(nq) || (it.alias || []).some(a => normTxt(a).includes(nq));
  return false;
}
function searchItems(q) {
  const nq = normTxt(q);
  if (nq.length < 2) return [];
  return cfg().items.filter(j => itemMatch(j, nq))
    .sort((a, b) => Object.keys(b.bares).length - Object.keys(a.bares).length)
    .slice(0, 60);
}

/* ---------- filtrado de locales ---------- */
function visibleVenues() {
  const c = cfg();
  const chipSet = f[c.chipState];
  const list = c.venues.filter(b => {
    if (sel && !sel.bares[b.id]) return false;
    if (f.q) {
      const nq = normTxt(f.q);
      if (!normTxt(b.nombre).includes(nq) && !normTxt(b.ciudad || '').includes(nq) && !normTxt(b.zona || '').includes(nq)) return false;
    }
    if (chipSet.size && !chipSet.has(b[c.chipField])) return false;
    if (mode === 'cervezas') for (const a of f.actividades) { if (!b[a]) return false; }
    if (b.valoracion < f.vmin) return false;
    if (b.resenas < f.rmin) return false;
    if (f.nmin > 0 && (b[c.minField] == null || b[c.minField] < f.nmin)) return false;
    return true;
  });
  const C = c.venues.reduce((s, b) => s + b.valoracion, 0) / c.venues.length, m = 100;
  const S = {
    relevancia: b => -score(b, C, m), valoracion: b => -b.valoracion,
    resenas: b => -b.resenas, nombre: b => b.nombre
  };
  S[c.ordenExtra[0]] = b => -(b[c.sortField] || 0);
  if (userLoc) S.distancia = b => Math.hypot(b.lat - userLoc.lat, b.lng - userLoc.lng);
  const fn = S[f.orden] || S.relevancia;
  list.sort((a, b2) => { const r = fn(a) - fn(b2); return isNaN(r) ? String(a.nombre).localeCompare(String(b2.nombre)) : r; });
  return list;
}
function activeFilterCount() {
  let n = f[cfg().chipState].size + (f.vmin > 0 ? 1 : 0) + (f.rmin > 0 ? 1 : 0) + (f.nmin > 0 ? 1 : 0);
  if (mode === 'cervezas') n += f.actividades.size;
  return n;
}

/* ---------- URL ---------- */
function writeURL() {
  const c = cfg();
  const p = new URLSearchParams();
  if (mode === 'cervezas') p.set('vista', 'cervezas');
  if (f.q) p.set('q', f.q);
  const chipSet = f[c.chipState];
  if (chipSet.size) p.set(mode === 'cervezas' ? 'tipos' : 'precios', [...chipSet].join('|'));
  if (mode === 'cervezas' && f.actividades.size) p.set('act', [...f.actividades].join('|'));
  if (f.vmin) p.set('vmin', String(f.vmin));
  if (f.rmin) p.set('rmin', String(f.rmin));
  if (f.nmin) p.set(c.minParam, String(f.nmin));
  if (f.orden !== 'relevancia') p.set('orden', f.orden);
  if (sel) p.set(c.urlParam, sel.nombre);
  if (tab === 'mapa') p.set('tab', 'mapa');
  if (sheetId) p.set('local', sheetId);
  p.set('lat', mapView.lat.toFixed(5)); p.set('lng', mapView.lng.toFixed(5)); p.set('z', String(mapView.z));
  history.replaceState(null, '', location.pathname + '?' + p.toString());
}
function readURL() {
  const p = new URLSearchParams(location.search);
  mode = p.get('vista') === 'cervezas' ? 'cervezas' : 'juegos';
  const c = cfg();
  f = emptyFilters();
  f.q = p.get('q') || '';
  (p.get(mode === 'cervezas' ? 'tipos' : 'precios') || '').split('|').filter(Boolean).forEach(v => f[c.chipState].add(v));
  f.vmin = +(p.get('vmin') || 0); f.rmin = +(p.get('rmin') || 0); f.nmin = +(p.get(c.minParam) || 0);
  f.orden = p.get('orden') || 'relevancia';
  (p.get('act') || '').split('|').filter(Boolean).forEach(v => { if (c.actChips && c.actChips[v]) f.actividades.add(v); });
  const iname = p.get(c.urlParam);
  if (iname) {
    sel = c.items.find(x => normTxt(x.nombre) === normTxt(iname)) || searchItems(iname)[0] || null;
  }
  if (p.get('lat')) mapView = { lat: +p.get('lat'), lng: +p.get('lng'), z: +(p.get('z') || 6) };
  if (p.get('tab') === 'mapa') tab = 'mapa';
  const loc = p.get('local');
  if (loc && c.venues.some(v => v.id === loc)) sheetId = loc;
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- clipboard ---------- */
function share() {
  const ok = () => toast('Enlace copiado con los filtros actuales');
  const legacy = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = location.href;
      ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.pointerEvents = 'none';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); ok();
    } catch (e) { toast('No se pudo copiar el enlace'); }
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(location.href).then(ok, legacy);
  else legacy();
}

/* ---------- geolocalización ---------- */
function nearMe() {
  if (!navigator.geolocation) { toast('Tu navegador no permite geolocalización'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    f.orden = 'distancia';
    flyTick++;
    renderAll();
    toast('Ordenado por distancia desde tu ubicación');
  }, () => toast('No se pudo obtener tu ubicación'), { timeout: 9000 });
}

/* ============================================================
   RENDER
   ============================================================ */
function renderChrome() {
  const c = cfg();
  document.title = c.docTitle;
  $('#brandIc').innerHTML = icon(c.brandIcon, 22, 1.8);
  $('#brandTitle').textContent = c.brandTitle;
  $('#brandSub').textContent = c.brandSub;
  document.querySelectorAll('[data-mode]').forEach(b => {
    b.classList.toggle('on', b.dataset.mode === mode);
    b.setAttribute('aria-selected', b.dataset.mode === mode);
  });
  document.querySelectorAll('.mode-ink').forEach(el => { el.style.transform = mode === 'cervezas' ? 'translateX(100%)' : 'none'; });
  document.querySelectorAll('[data-tab]').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === tab);
    b.setAttribute('aria-selected', b.dataset.tab === tab);
  });
  $('#tabPill').style.transform = tab === 'mapa' ? 'translateX(100%)' : 'none';
  $('#home').style.display = tab === 'buscar' ? '' : 'none';
  $('#maptab').style.display = tab === 'mapa' ? '' : 'none';
}

function renderHero() {
  const c = cfg();
  $('#heroTitle').textContent = c.heroTitle;
  $('#heroSub').textContent = c.heroSub;
  $('#searchInput').placeholder = c.searchPlaceholder;
  $('#searchInput').setAttribute('aria-label', c.searchPlaceholder);
  $('#quickChips').innerHTML = '<span class="quick-label">Populares</span>' + c.quickChips.map(qc =>
    `<button type="button" class="qchip" data-quick="${esc(qc.match)}">${esc(qc.label)}</button>`).join('');
  const sb = $('#selBanner');
  if (sel) {
    const n = Object.keys(sel.bares).length;
    sb.style.display = 'flex';
    sb.innerHTML = `<span>${c.bannerLead} <b>${esc(sel.nombre)}</b> <i>(${n} ${n === 1 ? 'local' : 'locales'})</i></span>
      <button type="button" data-action="clear-sel">Quitar filtro</button>`;
  } else { sb.style.display = 'none'; sb.innerHTML = ''; }
}

/* dropdown del buscador */
let dropOpen = false;
function renderDrop() {
  const q = $('#searchInput').value;
  const drop = $('#sdrop');
  const matches = searchItems(q);
  if (!dropOpen || !matches.length) { drop.style.display = 'none'; drop.innerHTML = ''; return; }
  const fams = {};
  matches.forEach(j => { (fams[j.familia] = fams[j.familia] || []).push(j); });
  const itemMeta = j => mode === 'juegos'
    ? [j.jugadores ? j.jugadores + ' jug.' : null, j.duracion].filter(Boolean).join(' · ')
    : [j.cervecera, j.estilo, j.abv != null ? j.abv + '%' : null].filter(Boolean).join(' · ');
  let html = '';
  Object.entries(fams).slice(0, 12).forEach(([fam, items]) => {
    if (items.length > 1) html += `<div class="s-fam">${esc(items[0].nombre.split(/[:\-–]/)[0].trim())} · ${items.length} versiones</div>`;
    items.slice(0, 8).forEach(j => {
      const nBares = Object.keys(j.bares).length;
      const badges = [...new Set(Object.values(j.bares).map(v => badgeFor(v.fuente, v.fecha, cfg().itemBadge).label))].slice(0, 2);
      const meta = itemMeta(j);
      html += `<button type="button" class="s-item" data-item="${esc(j.nombre)}">
        <span class="s-nm">${esc(j.nombre)}</span>
        <span class="s-meta">${nBares} ${nBares === 1 ? 'local' : 'locales'}${meta ? ' · ' + esc(meta) : ''}${badges.length ? ' · ' + esc(badges[0]) : ''}</span>
      </button>`;
    });
  });
  drop.innerHTML = html;
  drop.style.display = 'block';
}

/* barra de filtros + tarjetas */
function chipsFor() {
  const c = cfg();
  return [...new Set(c.venues.map(b => b[c.chipField]))].sort((a, b) => (c.chipOrder[a] ?? 9) - (c.chipOrder[b] ?? 9));
}
function filterBarHTML(list) {
  const c = cfg();
  const chips = chipsFor();
  const nActive = activeFilterCount();
  return `
    <input class="fname" id="fnameInput" value="${esc(f.q)}" placeholder="${esc(c.namePlaceholder)}" aria-label="${esc(c.namePlaceholder)}">
    <div class="fchips">
      ${chips.map(v => `<button type="button" class="chip${f[c.chipState].has(v) ? ' on' : ''}" data-chip="${esc(v)}">${esc(c.chips[v] || v)}</button>`).join('')}
      <button type="button" class="chip fbtn" data-action="open-filters">${icon('sliders', 14)} Filtros${nActive > 0 ? `<span class="fdot">${nActive}</span>` : ''}</button>
    </div>
    <div class="fmeta">
      <span class="count">Mostrando <b>${list.length}</b> de ${c.venues.length} locales</span>
      <label class="sort">Ordenar
        <select id="sortSel" aria-label="Ordenar por">
          <option value="relevancia"${f.orden === 'relevancia' ? ' selected' : ''}>Relevancia</option>
          <option value="valoracion"${f.orden === 'valoracion' ? ' selected' : ''}>Valoración</option>
          <option value="resenas"${f.orden === 'resenas' ? ' selected' : ''}>Nº de reseñas</option>
          <option value="${c.ordenExtra[0]}"${f.orden === c.ordenExtra[0] ? ' selected' : ''}>${c.ordenExtra[1]}</option>
          <option value="nombre"${f.orden === 'nombre' ? ' selected' : ''}>Nombre A-Z</option>
          ${f.orden === 'distancia' ? '<option value="distancia" selected>Distancia</option>' : ''}
        </select>
      </label>
    </div>`;
}
function cardHTML(b, i, active) {
  const c = cfg();
  let stat, statCls = 'stat';
  if (mode === 'juegos') {
    if (b.num_juegos != null) {
      stat = `${icon('dice', 13, 1.8)} ${fmtN(b.num_juegos)} juegos${b.num_juegos_fuente !== 'catalogo-web' ? '<i> (est.)</i>' : ''}`;
      if (b.num_juegos_fuente !== 'catalogo-web') statCls += ' soft';
    } else { stat = `${icon('dice', 13, 1.8)} Catálogo no publicado`; statCls += ' soft'; }
  } else {
    if (b.grifos != null) stat = `${icon('pint', 13, 1.8)} ${b.grifos} grifos`;
    else if (b.cervezas_total != null) stat = `${icon('pint', 13, 1.8)} ~${fmtN(b.cervezas_total)} referencias`;
    else stat = `${icon('pint', 13, 1.8)} ${esc(tipoLabel(mode, b.tipo))}`;
  }
  const match = sel && sel.bares[b.id] ? badgeFor(sel.bares[b.id].fuente, sel.bares[b.id].fecha, c.itemBadge) : null;
  return `<button type="button" class="vcard${active ? ' active' : ''}" style="animation-delay:${Math.min(i, 14) * 32}ms" data-venue="${esc(b.id)}">
    <span class="vc-top"><h3>${esc(b.nombre)}</h3><span class="rate">★ ${b.valoracion.toFixed(1)} <i>(${fmtN(b.resenas)})</i></span></span>
    <span class="vc-where">${esc(tipoLabel(mode, b.tipo))} · ${esc(b.ciudad)}${b.zona && b.zona !== b.ciudad ? ' — ' + esc(b.zona) : ''}</span>
    <span class="vc-stats">
      <span class="${statCls}">${stat}</span>
      ${mode === 'juegos' && b.precio ? `<span class="vc-price">${esc(PRECIO[b.precio] || '')}</span>` : ''}
      ${match ? `<span class="badge ${match.cls}">${esc(match.label)}</span>` : ''}
    </span>
  </button>`;
}
function renderResults() {
  const list = visibleVenues();
  $('#fbar').innerHTML = filterBarHTML(list);
  const cards = list.length
    ? `<div class="cards">${list.map((b, i) => cardHTML(b, i)).join('')}</div>`
    : `<div class="empty">
        <div class="empty-ic">${icon(mode === 'juegos' ? 'dice' : 'pint', 40, 1.4)}</div>
        <b>Nada por aquí con estos filtros</b>
        <p>Prueba a quitar algún filtro o buscar otra cosa.</p>
        <button type="button" class="btn-outline" data-action="clear-all">Limpiar todo</button>
      </div>`;
  $('#cardsWrap').innerHTML = cards;
  /* mapa lateral (pestaña mapa) */
  $('#fbarMap').innerHTML = filterBarHTML(list);
  $('#cardsMap').innerHTML = `<div class="cards in-map">${list.map((b, i) => cardHTML(b, i, b.id === sheetId)).join('')}</div>`;
  syncMarkers(list);
}

/* ---------- ficha de local ---------- */
function row(label, inner) { return `<div class="drow"><b>${label}</b><span>${inner}</span></div>`; }
function venueSheetHTML(b) {
  const c = cfg();
  const match = sel && sel.bares[b.id] ? badgeFor(sel.bares[b.id].fuente, sel.bares[b.id].fecha, c.itemBadge) : null;
  const pEv = badgeFor(b.precio_evidencia, undefined, FUENTE_BADGE);
  const fu = CERVEZA_FUENTE[b.datos_fuente || 'prensa'] || CERVEZA_FUENTE.prensa;
  const acts = mode === 'cervezas' ? Object.keys(ACTIVIDADES).filter(a => b[a]) : [];
  const fecha = fmtFecha(b.evidencia_fecha);
  let rows = '';
  if (match) rows += row(mode === 'juegos' ? 'Tu juego' : 'Tu cerveza',
    `<span class="ok-check">✓</span> ${esc(sel.nombre)} <span class="badge ${match.cls}">${esc(match.label)}</span>`);
  rows += row('Valoración', `<span class="rate big">★ ${b.valoracion.toFixed(1)}</span> <span class="reviews">(${fmtN(b.resenas)} reseñas en Google)</span>`);
  if (mode === 'juegos') {
    rows += row('Precio', `${esc(b.precio_detalle || PRECIO[b.precio || 'desconocido'])} <span class="badge ${pEv.cls}">${esc(pEv.label)}</span>`);
    rows += b.num_juegos != null
      ? row('Juegos', `${fmtN(b.num_juegos)} ${b.num_juegos_fuente === 'catalogo-web' ? '<span class="badge ok">Confirmado en catálogo web</span>' : '<span class="badge est">Estimado</span>'}`)
      : row('Juegos', '<span class="nodata">Catálogo no publicado</span>');
  } else {
    if (b.grifos != null) rows += row('Grifos', `${b.grifos} <span class="badge ${fu[1]}">${esc(fu[0])}</span>`);
    if (b.cervezas_total != null) rows += row('Referencias', `~${fmtN(b.cervezas_total)} <span class="badge ${fu[1]}">${esc(fu[0])}</span>`);
    if (acts.length) rows += row('Actividades', acts.map(a => {
      const d = b[a]; const bd = badgeFor(d && d.fuente, d && d.fecha, ACT_FUENTE);
      return `<span class="act-item">${esc(ACTIVIDADES[a])}${d && d.detalle ? ` <i>(${esc(d.detalle)})</i>` : ''} <span class="badge ${bd.cls}">${esc(bd.label)}</span>${d && d.fecha && !['resenas', 'visto-untappd'].includes(d.fuente || '') ? ` <span class="ev-fecha">${fmtFecha(d.fecha)}</span>` : ''}${d && d.url ? ` <a class="src-link" href="${esc(d.url)}" target="_blank" rel="noopener">Ver fuente ${icon('ext', 11)}</a>` : ''}</span>`;
    }).join(''));
    if (b.musica_puntual) rows += row('Música en directo', `<i>(programación puntual)</i> <span class="badge est">${esc((ACT_FUENTE[b.musica_puntual.fuente] || ['Dato estimado'])[0])}</span>`);
  }
  if (mode === 'cervezas' && b.actualizado) rows += row('Evidencia', `<span>Datos revisados el <b class="ev-date">${fmtFecha(b.actualizado)}</b></span>`);
  if (fecha || b.evidencia_url) {
    rows += row('Evidencia', [fecha ? esc(fecha) : null,
      b.evidencia_url ? `<a href="${esc(b.evidencia_url)}" target="_blank" rel="noopener" class="src-link">Ver fuente ${icon('ext', 11)}</a>` : null
    ].filter(Boolean).join(' · '));
  }
  return `
    <button type="button" class="sheet-x" data-action="close-sheet" aria-label="Cerrar">${icon('close', 14, 2.4)}</button>
    <h3>${esc(b.nombre)}</h3>
    <div class="d-tipo">${esc(tipoLabel(mode, b.tipo))} · ${esc(b.ciudad)}${b.zona ? ' — ' + esc(b.zona) : ''}</div>
    <div class="d-dir">${esc(b.direccion || '')}</div>
    ${rows}
    ${b.descripcion ? `<p class="d-desc">${esc(b.descripcion)}</p>` : ''}
    <div class="d-btns">
      <a class="btn-primary" href="${esc(b.maps_url)}" target="_blank" rel="noopener">Cómo llegar${icon('ext', 13)}</a>
      ${b.web ? `<a class="btn-outline" href="${esc(b.web)}" target="_blank" rel="noopener">Web del local</a>` : ''}
    </div>
    ${mode === 'juegos' && b.actualizado ? `<div class="d-upd">Datos revisados el ${fmtFecha(b.actualizado)}</div>` : ''}`;
}

/* ---------- hoja de filtros ---------- */
function filterSheetHTML(list) {
  const c = cfg();
  const chips = chipsFor();
  return `
    <button type="button" class="sheet-x" data-action="close-sheet" aria-label="Cerrar">${icon('close', 14, 2.4)}</button>
    <h3>Filtros</h3>
    <div class="fgroup">
      <div class="flabel">${esc(c.chipsLabel)}</div>
      <div class="chips">
        ${chips.map(v => `<button type="button" class="chip${f[c.chipState].has(v) ? ' on' : ''}" data-chip="${esc(v)}">${esc(c.chips[v] || v)}</button>`).join('')}
      </div>
    </div>
    ${c.actChips ? `<div class="fgroup">
      <div class="flabel">Actividades</div>
      <div class="chips">
        ${Object.entries(c.actChips).map(([v, t]) => `<button type="button" class="chip${f.actividades.has(v) ? ' on' : ''}" data-act="${esc(v)}">${esc(t)}</button>`).join('')}
      </div>
    </div>` : ''}
    <div class="fgrid">
      <div class="fgroup">
        <div class="flabel">Valoración mín. <output id="outVmin">${f.vmin}★</output></div>
        <input type="range" min="0" max="5" step="0.5" value="${f.vmin}" data-range="vmin" aria-label="Valoración mínima">
      </div>
      <div class="fgroup">
        <div class="flabel">Reseñas mín. <output id="outRmin">${f.rmin}</output></div>
        <input type="range" min="0" max="1500" step="50" value="${f.rmin}" data-range="rmin" aria-label="Reseñas mínimas">
      </div>
      <div class="fgroup">
        <div class="flabel">${esc(c.minLabel)}</div>
        <select data-select="nmin" aria-label="${esc(c.minLabel)}">
          ${c.minOptions.map(([v, t]) => `<option value="${v}"${f.nmin === v ? ' selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="fgroup">
        <div class="flabel">Ordenar por</div>
        <select data-select="orden" aria-label="Ordenar por">
          <option value="relevancia"${f.orden === 'relevancia' ? ' selected' : ''}>Relevancia (valoración + reseñas)</option>
          <option value="valoracion"${f.orden === 'valoracion' ? ' selected' : ''}>Valoración</option>
          <option value="resenas"${f.orden === 'resenas' ? ' selected' : ''}>Nº de reseñas</option>
          <option value="${c.ordenExtra[0]}"${f.orden === c.ordenExtra[0] ? ' selected' : ''}>${c.ordenExtra[1]}</option>
          <option value="nombre"${f.orden === 'nombre' ? ' selected' : ''}>Nombre A-Z</option>
          ${userLoc ? `<option value="distancia"${f.orden === 'distancia' ? ' selected' : ''}>Distancia (cerca de mí)</option>` : ''}
        </select>
      </div>
    </div>
    <div class="d-btns">
      <button type="button" class="btn-outline" data-action="clear-filters">Limpiar</button>
      <button type="button" class="btn-primary" data-action="close-sheet">Ver ${list.length} locales</button>
    </div>`;
}

/* ---------- sheets (overlay) ---------- */
function openSheet(inner) {
  const root = $('#sheetRoot');
  root.innerHTML = `<div class="overlay" data-action="close-overlay"><div class="sheet" role="dialog" aria-modal="true">${inner}</div></div>`;
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  $('#sheetRoot').innerHTML = '';
  document.body.style.overflow = '';
  if (sheetId) { sheetId = null; renderResults(); }
  showFilters = false;
  writeURL();
}
function renderSheet() {
  if (sheetId) {
    const b = cfg().venues.find(v => v.id === sheetId);
    if (b) { openSheet(venueSheetHTML(b)); return; }
  }
  if (showFilters) { openSheet(filterSheetHTML(visibleVenues())); return; }
  closeSheet();
}

/* ============================================================
   MAPA
   ============================================================ */
let map = null, markerLayer = null, userMk = null, lastFly = 0;
const pinHtml = (b, s) => `<div class="mpin${b.tipo === 'irish' ? ' irish' : ''}${s ? ' sel' : ''}"><span>★ ${b.valoracion.toFixed(1)}</span></div>`;
function initMap() {
  map = L.map($('#mapaEl'), { zoomControl: false, attributionControl: true }).setView([mapView.lat, mapView.lng], mapView.z);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  /* Esri Light Gray: sin marca de agua, con atribución. Capa base + etiquetas. */
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    attribution: 'Tiles © <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> · Fuente: Esri, TomTom, Garmin, FAO, NOAA, USGS'
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  map.on('moveend', () => {
    const c = map.getCenter();
    mapView = { lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), z: map.getZoom() };
    writeURL();
  });
}
function syncMarkers(list) {
  if (!map) return;
  markerLayer.clearLayers();
  (list || visibleVenues()).forEach(b => {
    if (b.lat == null || b.lng == null) return;
    const s = b.id === sheetId;
    const ic = L.divIcon({ className: 'mpin-wrap', html: pinHtml(b, s), iconSize: null, iconAnchor: [0, 0] });
    const mk = L.marker([b.lat, b.lng], { icon: ic, zIndexOffset: s ? 1000 : 0 });
    mk.on('click', () => { sheetId = b.id; renderSheet(); renderResults(); writeURL(); panIntoView(b); });
    markerLayer.addLayer(mk);
  });
  if (userLoc) {
    if (userMk) map.removeLayer(userMk);
    userMk = L.circleMarker([userLoc.lat, userLoc.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#FF385C', fillOpacity: 1 }).addTo(map);
  }
  if (userLoc && flyTick !== lastFly) { lastFly = flyTick; map.setView([userLoc.lat, userLoc.lng], 12, { animate: true }); }
}
function panIntoView(b) {
  if (!map || !b) return;
  const pt = map.latLngToContainerPoint([b.lat, b.lng]);
  const sz = map.getSize();
  if (pt.x < 40 || pt.y < 40 || pt.x > sz.x - 40 || pt.y > sz.y - 120) map.panTo([b.lat, b.lng], { animate: true });
}

/* ---------- render global ---------- */
function renderAll() {
  renderChrome();
  renderHero();
  renderResults();
  writeURL();
  if (tab === 'mapa' && map) setTimeout(() => { map.invalidateSize(); syncMarkers(); }, 60);
}
function switchMode(m) {
  if (m === mode) return;
  mode = m; f = emptyFilters(); sel = null; sheetId = null; closeSheet();
  $('#searchInput').value = '';
  renderAll();
}

/* ============================================================
   EVENTOS
   ============================================================ */
function bindEvents() {
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => switchMode(b.dataset.mode)));
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; renderAll(); }));
  $('#btnNear').addEventListener('click', nearMe);
  $('#btnNearMap').addEventListener('click', nearMe);
  $('#btnShare').addEventListener('click', share);

  const si = $('#searchInput');
  si.addEventListener('input', () => { dropOpen = true; renderDrop(); });
  si.addEventListener('focus', () => { dropOpen = true; renderDrop(); });
  document.addEventListener('click', e => {
    if (!e.target.closest('.sbox')) { dropOpen = false; renderDrop(); }
    const it = e.target.closest('[data-item]');
    if (it) {
      const found = cfg().items.find(x => x.nombre === it.dataset.item);
      if (found) { sel = found; si.value = ''; dropOpen = false; renderDrop(); renderAll(); }
      return;
    }
    const qc = e.target.closest('[data-quick]');
    if (qc) {
      const m = qc.dataset.quick;
      const found = cfg().items.find(x => normTxt(x.nombre) === normTxt(m)) || searchItems(m)[0];
      if (found) { sel = found; renderAll(); }
      return;
    }
    const chip = e.target.closest('[data-chip]');
    if (chip) {
      const c = cfg(); const s = f[c.chipState]; const v = chip.dataset.chip;
      if (s.has(v)) s.delete(v); else s.add(v);
      renderResults(); if (showFilters) renderSheet();
      writeURL(); return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
      const v = act.dataset.act;
      if (f.actividades.has(v)) f.actividades.delete(v); else f.actividades.add(v);
      renderResults(); if (showFilters) renderSheet();
      writeURL(); return;
    }
    const vcard = e.target.closest('[data-venue]');
    if (vcard) { sheetId = vcard.dataset.venue; renderSheet(); renderResults(); writeURL(); return; }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'clear-sel') { sel = null; renderAll(); }
    else if (a === 'clear-all') { f = emptyFilters(); sel = null; renderAll(); }
    else if (a === 'clear-filters') { f = emptyFilters(); renderResults(); renderSheet(); writeURL(); }
    else if (a === 'open-filters') { showFilters = true; renderSheet(); }
    else if (a === 'close-sheet' || a === 'close-overlay') { if (a === 'close-overlay' && e.target !== el) return; closeSheet(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'fnameInput') { f.q = e.target.value.trim(); renderResults(); writeURL(); return; }
    const r = e.target.closest && e.target.closest('[data-range]');
    if (r) {
      f[r.dataset.range] = +r.value;
      if (r.dataset.range === 'vmin') $('#outVmin').textContent = f.vmin + '★';
      if (r.dataset.range === 'rmin') $('#outRmin').textContent = f.rmin;
      renderResults(); writeURL();
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'sortSel') { f.orden = e.target.value; renderResults(); writeURL(); return; }
    const s = e.target.closest && e.target.closest('[data-select]');
    if (s) {
      f[s.dataset.select] = s.dataset.select === 'nmin' ? +s.value : s.value;
      renderResults(); writeURL();
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSheet(); dropOpen = false; renderDrop(); } });
}

/* ---------- arranque ---------- */
(async function init() {
  try {
    const [b, c, j, m] = await Promise.all(
      ['bares.json', 'cervezas.json', 'juegos.json', 'marcas.json'].map(u => fetch(u).then(r => {
        if (!r.ok) throw new Error('No se pudo cargar ' + u);
        return r.json();
      }))
    );
    DATA.juegos.venues = b; DATA.juegos.items = j;
    DATA.cervezas.venues = c; DATA.cervezas.items = m;
  } catch (err) {
    $('#cardsWrap').innerHTML = `<div class="empty"><b>Error cargando los datos</b><p>${esc(err.message)}. Recarga la página en unos segundos.</p></div>`;
    return;
  }
  readURL();
  initMap();
  bindEvents();
  renderChrome();
  renderHero();
  renderResults();
  writeURL();
  if (sheetId) renderSheet();
  if (tab === 'mapa') setTimeout(() => { map.invalidateSize(); syncMarkers(); }, 60);
  if (!localStorage.getItem('bgf_welcome2')) {
    setTimeout(() => toast('Nuevo diseño: busca un juego o una cerveza y te decimos dónde.'), 800);
    localStorage.setItem('bgf_welcome2', '1');
  }
})();
