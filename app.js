/* Board Games & Craft Beer Finder España */
'use strict';

const TIPOS_LOCAL = {
  'cafe-juegos':   'Café de juegos',
  'bar-juegos':    'Bar de juegos',
  'cafe-con-juegos':'Café con juegos',
  'pub-con-juegos':'Pub con juegos',
  'gaming-bar':    'Gaming bar',
  'chess-bar':     'Bar de ajedrez',
  'club':          'Club asociativo'
};
const PRECIO = {
  gratis:'Gratis', consumicion:'Con tu consumición',
  cover:'Cover (tarifa de juego)', club:'Cuota de club', desconocido:'Sin datos'
};
const FUENTE_BADGE = { 'catalogo-web':['Confirmado en catálogo web','ok'], 'estimado':['Dato estimado','est'], 'desconocido':['Sin datos','est'], 'sin-catalogo':['Catálogo no publicado','est'] };

const CERVEZA_TIPOS = {
  'fabrica':      'Fábrica con bar',
  'taproom':      'Taproom de cervecera',
  'especializado':'Bar especializado',
  'clasica':      'Clásica de importación',
  'mercado':      'Puesto de mercado'
};
const CERVEZA_FUENTE = { 'web-oficial':['Según su web','ok'], 'prensa':['Según prensa','est'], 'perfil':['Según guía cervecera','est'] };

const MODES = {
  juegos: {
    brandIcon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:5px"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.6" fill="currentColor" stroke="none"/></svg>',
    brandTitle: 'Board Games Finder España',
    brandSub: 'Bares y cafés de juegos de mesa en España',
    docTitle: 'Board Games Finder España — Bares de juegos de mesa en España',
    files: ['bares.json','juegos.json'],
    namePlaceholder: 'Buscar local por nombre o ciudad…',
    chipsLabel: 'Precio para jugar',
    chips: PRECIO,
    chipOrder: {gratis:0, consumicion:1, cover:2, club:3, desconocido:4},
    chipField: 'precio',
    minLabel: 'Nº de juegos',
    minOptions: [[0,'Cualquiera'],[50,'50+'],[200,'200+'],[500,'500+'],[1000,'1000+']],
    minField: 'num_juegos',
    minParam: 'jmin',
    ordenExtra: ['juegos','Nº de juegos'],
    sortField: 'num_juegos',
    tipoLabel: b => TIPOS_LOCAL[b.tipo],
    hasGameSearch: true,
    chipState: 'precios'
  },
  cervezas: {
    brandIcon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:5px"><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M5 6h12v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M7 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/></svg>',
    brandTitle: 'Craft Beer Finder Madrid',
    brandSub: 'Cervecerías de especialidad en Madrid',
    docTitle: 'Craft Beer Finder Madrid — Cervecerías de especialidad',
    files: ['cervezas.json'],
    namePlaceholder: 'Buscar cervecería por nombre o barrio…',
    chipsLabel: 'Tipo de local',
    chips: CERVEZA_TIPOS,
    chipOrder: {fabrica:0, taproom:1, especializado:2, clasica:3, mercado:4},
    chipField: 'tipo',
    minLabel: 'Nº de grifos',
    minOptions: [[0,'Cualquiera'],[5,'5+'],[10,'10+'],[15,'15+']],
    minField: 'grifos',
    minParam: 'gmin',
    ordenExtra: ['grifos','Nº de grifos'],
    sortField: 'grifos',
    tipoLabel: b => CERVEZA_TIPOS[b.tipo],
    hasGameSearch: false,
    chipState: 'tipos'
  }
};

let MODE = 'juegos', CFG = MODES.juegos;
let BARES = [], JUEGOS = [];
let markers = {}, map, userMarker = null;

const state = {
  q:'', precios:new Set(), tipos:new Set(),
  vmin:0, rmin:0, nmin:0, orden:'relevancia', juego:null
};

/* ---------- Utils ---------- */
const $ = s => document.querySelector(s);
const normTxt = s => (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const fmtN = n => n==null ? null : n.toLocaleString('es-ES');
function score(b, C, m){ return (b.resenas/(b.resenas+m))*b.valoracion + (m/(b.resenas+m))*C; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }

/* ---------- Init ---------- */
function start(){
  const params=new URLSearchParams(location.search);
  MODE = params.get('vista')==='cervezas' ? 'cervezas' : 'juegos';
  initMap();
  loadMode();
}

function loadMode(){
  CFG = MODES[MODE];
  applyModeChrome();
  Promise.all(CFG.files.map(f=>fetch(f).then(r=>r.json()))).then(res=>{
    BARES = res[0]; JUEGOS = res[1] || [];
    buildFilters(); readURL(); apply();
    map.fitBounds(L.latLngBounds(BARES.map(b=>[b.lat,b.lng])), {padding:[30,30]});
    bindUI();
  });
}

function applyModeChrome(){
  $('#brandTitle').innerHTML = CFG.brandIcon + CFG.brandTitle;
  $('#brandSub').textContent = CFG.brandSub;
  document.title = CFG.docTitle;
  $('#nameSearch').placeholder = CFG.namePlaceholder;
  $('#chipsLabel').textContent = CFG.chipsLabel;
  $('#minLabel').textContent = CFG.minLabel;
  $('#gameSearchWrap').style.display = CFG.hasGameSearch ? '' : 'none';
  $('#vsJuegos').classList.toggle('on', MODE==='juegos');
  $('#vsCervezas').classList.toggle('on', MODE==='cervezas');
  const sel=$('#fNmin');
  sel.innerHTML = CFG.minOptions.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
  const ord=$('#fOrden');
  ord.innerHTML = `<option value="relevancia">Relevancia (valoración + reseñas)</option>
    <option value="valoracion">Valoración</option>
    <option value="resenas">Nº de reseñas</option>
    <option value="${CFG.ordenExtra[0]}">${CFG.ordenExtra[1]}</option>
    <option value="nombre">Nombre A-Z</option>`;
}

function switchMode(m){
  if(m===MODE) return;
  MODE = m;
  Object.values(markers).forEach(mk=>map.removeLayer(mk)); markers={};
  if(userMarker){map.removeLayer(userMarker);userMarker=null;}
  state.q=''; state.precios.clear(); state.tipos.clear();
  state.vmin=0; state.rmin=0; state.nmin=0; state.orden='relevancia';
  clearGame(true);
  $('#nameSearch').value='';
  loadMode();
}

function initMap(){
  map = L.map('map', {zoomControl:false}).setView([40.2,-3.4], 6);
  L.control.zoom({position:'bottomright'}).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contribuidores', maxZoom:19
  }).addTo(map);
}

function pinIcon(b){
  return L.divIcon({className:'', iconSize:[30,30], iconAnchor:[15,28], popupAnchor:[0,-26],
    html:`<div class="pin" style="width:30px;height:30px"><span>${b.valoracion.toFixed(1)}</span></div>`});
}

/* ---------- Filters UI ---------- */
function buildFilters(){
  const chips=[...new Set(BARES.map(b=>b[CFG.chipField]))].sort((a,b)=>(CFG.chipOrder[a]??9)-(CFG.chipOrder[b]??9));
  const el=$('#chipsFiltro');
  el.innerHTML = chips.map(v=>`<button class="chip" data-v="${v}">${CFG.chips[v]}</button>`).join('');
  el.querySelectorAll('.chip').forEach(ch=>ch.addEventListener('click',()=>{
    const v=ch.dataset.v, set=state[CFG.chipState];
    set.has(v)?set.delete(v):set.add(v);
    ch.classList.toggle('on'); apply(); writeURL();
  }));
}

let uiBound = false;
function bindUI(){
  if(uiBound) return; uiBound = true;
  $('#vsJuegos').addEventListener('click',()=>switchMode('juegos'));
  $('#vsCervezas').addEventListener('click',()=>switchMode('cervezas'));
  $('#nameSearch').addEventListener('input',e=>{state.q=e.target.value.trim();apply();writeURL();});
  $('#fVmin').addEventListener('input',e=>{state.vmin=+e.target.value;$('#outVmin').textContent=state.vmin+'★';apply();writeURL();});
  $('#fRmin').addEventListener('input',e=>{state.rmin=+e.target.value;$('#outRmin').textContent=state.rmin;apply();writeURL();});
  $('#fNmin').addEventListener('change',e=>{state.nmin=+e.target.value;apply();writeURL();});
  $('#fOrden').addEventListener('change',e=>{state.orden=e.target.value;apply();writeURL();});
  $('#btnShare').addEventListener('click',()=>{
    navigator.clipboard.writeText(location.href).then(()=>toast('Enlace copiado con los filtros actuales'));
  });
  $('#btnNear').addEventListener('click',nearMe);
  $('#bannerClear').addEventListener('click',()=>clearGame());
  $('#gsClear').addEventListener('click',()=>clearGame());
  const gi=$('#gameInput'), dd=$('#gsDropdown');
  gi.addEventListener('input',()=>{ renderGameDropdown(gi.value); });
  gi.addEventListener('focus',()=>{ if(gi.value.trim().length>=2) dd.style.display='block'; });
  document.addEventListener('click',e=>{ if(!e.target.closest('.game-search')) dd.style.display='none'; });
}

/* ---------- Game search ---------- */
function gameMatches(q){
  const nq=normTxt(q); if(nq.length<2) return [];
  return JUEGOS.filter(j=>normTxt(j.nombre).includes(nq)).slice(0,60);
}
function renderGameDropdown(q){
  const dd=$('#gsDropdown');
  const ms=gameMatches(q);
  if(!ms.length){ dd.style.display='none'; return; }
  const fams={};
  ms.forEach(j=>{ (fams[j.familia]=fams[j.familia]||[]).push(j); });
  let html='';
  Object.entries(fams).slice(0,12).forEach(([fam,list])=>{
    if(list.length>1) html+=`<div class="gs-family">${list[0].nombre.split(/[:\-–]/)[0].trim()} · ${list.length} versiones</div>`;
    list.slice(0,8).forEach(j=>{
      const idx=JUEGOS.indexOf(j);
      const barNames=Object.keys(j.bares).map(id=>BARES.find(b=>b.id===id)?.nombre||id);
      const badges=[...new Set(Object.values(j.bares).map(v=>{const f=FUENTE_BADGE[v.fuente]||FUENTE_BADGE.estimado;return `<span class="badge ${f[1]}">${f[0]}</span>`;}))].join(' ');
      const extra=[j.jugadores?j.jugadores+' jug.':null, j.duracion].filter(Boolean).join(' · ');
      html+=`<div class="gs-item" data-i="${idx}"><div class="nm">${j.nombre}</div><div class="meta"><span>${barNames.join(' · ')}</span>${badges}${extra?`<span>${extra}</span>`:''}</div></div>`;
    });
  });
  dd.innerHTML=html; dd.style.display='block';
  dd.querySelectorAll('.gs-item').forEach(it=>it.addEventListener('click',()=>{
    const j=JUEGOS[+it.dataset.i];
    selectGame(j);
    dd.style.display='none';
  }));
}
function selectGame(j){
  state.juego=j;
  $('#gameInput').value=j.nombre;
  $('#gsClear').style.display='block';
  $('#bannerGame').textContent=j.nombre;
  $('#bannerNote').textContent='(' + Object.keys(j.bares).length + ' local' + (Object.keys(j.bares).length>1?'es':'') + ')';
  $('#gameBanner').classList.add('show');
  apply(); writeURL();
}
function clearGame(silent){
  state.juego=null; $('#gameInput').value=''; $('#gsClear').style.display='none';
  $('#gameBanner').classList.remove('show');
  if(!silent){ apply(); writeURL(); }
}

/* ---------- Filter + render ---------- */
function visibleBars(){
  const chipSet=state[CFG.chipState];
  let list=BARES.filter(b=>{
    if(state.juego && !state.juego.bares[b.id]) return false;
    if(state.q){
      const nq=normTxt(state.q);
      if(!normTxt(b.nombre).includes(nq) && !normTxt(b.ciudad||'').includes(nq) && !normTxt(b.zona||'').includes(nq)) return false;
    }
    if(chipSet.size && !chipSet.has(b[CFG.chipField])) return false;
    if(b.valoracion < state.vmin) return false;
    if(b.resenas < state.rmin) return false;
    if(state.nmin>0 && (b[CFG.minField]==null || b[CFG.minField] < state.nmin)) return false;
    return true;
  });
  const C=BARES.reduce((s,b)=>s+b.valoracion,0)/BARES.length, m=100;
  const S={relevancia:b=>-score(b,C,m), valoracion:b=>-b.valoracion, resenas:b=>-b.resenas, nombre:b=>b.nombre};
  S[CFG.ordenExtra[0]] = b=>-(b[CFG.sortField]||0);
  list.sort((a,b2)=>{const f=S[state.orden];const r=f(a)-f(b2);return isNaN(r)?String(a.nombre).localeCompare(String(b2.nombre)):r;});
  return list;
}

function goToBar(id){
  const b=BARES.find(x=>x.id===id);
  highlightCard(id);
  map.setView([b.lat,b.lng],15,{animate:true});
  markers[id].openPopup();
  if(window.innerWidth<=900) window.scrollTo({top:0,behavior:'smooth'});
}

function apply(){
  const list=visibleBars();
  Object.values(markers).forEach(mk=>map.removeLayer(mk)); markers={};
  list.forEach(b=>{
    const mk=L.marker([b.lat,b.lng],{icon:pinIcon(b)}).addTo(map);
    mk.bindPopup(popupHTML(b),{maxWidth:320});
    mk.on('click',()=>highlightCard(b.id));
    markers[b.id]=mk;
  });
  $('#results').innerHTML=list.map(b=>cardHTML(b)).join('');
  $('#count').textContent=`Mostrando ${list.length} de ${BARES.length} locales`;
  document.querySelectorAll('.card').forEach(c=>c.addEventListener('click',()=>goToBar(c.dataset.id)));
}
function highlightCard(id){
  document.querySelectorAll('.card').forEach(c=>c.classList.toggle('active',c.dataset.id===id));
  const el=document.querySelector(`.card[data-id="${id}"]`);
  if(el && window.innerWidth>900) el.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function cardHTML(b){
  if(MODE==='cervezas'){
    let esp;
    if(b.grifos!=null) esp = `${b.grifos} grifos`;
    else if(b.cervezas_total!=null) esp = `~${fmtN(b.cervezas_total)} referencias`;
    else esp = CFG.tipoLabel(b);
    return `<div class="card" data-id="${b.id}">
      <h3>${b.nombre}</h3>
      <div class="where">${CFG.tipoLabel(b)} · ${b.zona}</div>
      <div class="sub"><span class="stars">★ ${b.valoracion.toFixed(1)}</span> <span class="reviews">(${fmtN(b.resenas)})</span> · ${esp}</div>
    </div>`;
  }
  const nj = b.num_juegos!=null ? `${fmtN(b.num_juegos)} juegos` : 'Catálogo no publicado';
  const ev = b.num_juegos_fuente==='catalogo-web' ? '' : (b.num_juegos!=null ? ' <span class="score-flag">(estimado)</span>' : '');
  const precio = `<span class="score-flag"> · ${PRECIO[b.precio]}</span>`;
  return `<div class="card" data-id="${b.id}">
    <h3>${b.nombre}</h3>
    <div class="where">${TIPOS_LOCAL[b.tipo]} · ${b.ciudad}${b.zona && b.zona!==b.ciudad ? ' — '+b.zona : ''}</div>
    <div class="sub"><span class="stars">★ ${b.valoracion.toFixed(1)}</span> <span class="reviews">(${fmtN(b.resenas)})</span> · ${nj}${ev}${precio}</div>
  </div>`;
}
function popupHTML(b){
  if(MODE==='cervezas'){
    const fu = CERVEZA_FUENTE[b.datos_fuente] || CERVEZA_FUENTE.prensa;
    let esp='';
    if(b.grifos!=null) esp += `<div class="row"><b>Grifos</b><span>${b.grifos} <span class="badge ${fu[1]}">${fu[0]}</span></span></div>`;
    if(b.cervezas_total!=null) esp += `<div class="row"><b>Referencias</b><span>~${fmtN(b.cervezas_total)} <span class="badge ${fu[1]}">${fu[0]}</span></span></div>`;
    const webBtn = b.web ? `<a class="btn-web" href="${b.web}" target="_blank" rel="noopener">Web</a>` : '';
    return `<div class="pop">
      <h3>${b.nombre}</h3>
      <div class="tipo-zona">${CFG.tipoLabel(b)} · ${b.zona}</div>
      <div class="dir">${b.direccion}</div>
      <div class="row"><b>Valoración</b><span><span class="stars">★ ${b.valoracion.toFixed(1)}</span> <span class="reviews">(${fmtN(b.resenas)} reseñas en Google)</span></span></div>
      ${esp}
      <div style="font-size:12.5px;color:var(--muted);margin-top:7px">${b.descripcion}</div>
      <div class="btns"><a class="btn-maps" href="${b.maps_url}" target="_blank" rel="noopener">Cómo llegar (Google Maps)</a>${webBtn}</div>
    </div>`;
  }
  const nj = b.num_juegos!=null
    ? `<div class="row"><b>Juegos</b><span>${fmtN(b.num_juegos)} ${b.num_juegos_fuente==='catalogo-web'?'<span class="badge ok">Confirmado en catálogo web</span>':'<span class="badge est">Estimado</span>'}</span></div>`
    : `<div class="row"><b>Juegos</b><span class="nodata">Catálogo no publicado</span></div>`;
  const pEv = FUENTE_BADGE[b.precio_evidencia] || FUENTE_BADGE.estimado;
  const precio = `<div class="row"><b>Precio</b><span>${b.precio_detalle} <span class="badge ${pEv[1]}">${pEv[0]}</span></span></div>`;
  const juegoInfo = state.juego && state.juego.bares[b.id]
    ? `<div class="row"><b>Tu juego</b><span>✓ ${state.juego.nombre} disponible <span class="badge ok">Confirmado en catálogo web</span></span></div>` : '';
  const webBtn = b.web ? `<a class="btn-web" href="${b.web}" target="_blank" rel="noopener">Web</a>` : '';
  return `<div class="pop">
    <h3>${b.nombre}</h3>
    <div class="tipo-zona">${TIPOS_LOCAL[b.tipo]} · ${b.ciudad}</div>
    <div class="dir">${b.direccion} — ${b.zona}</div>
    <div class="row"><b>Valoración</b><span><span class="stars">★ ${b.valoracion.toFixed(1)}</span> <span class="reviews">(${fmtN(b.resenas)} reseñas en Google)</span></span></div>
    ${precio}${nj}${juegoInfo}
    <div style="font-size:12.5px;color:var(--muted);margin-top:7px">${b.descripcion}</div>
    <div class="btns"><a class="btn-maps" href="${b.maps_url}" target="_blank" rel="noopener">Cómo llegar (Google Maps)</a>${webBtn}</div>
  </div>`;
}

/* ---------- Near me ---------- */
function nearMe(){
  if(!navigator.geolocation){toast('Tu navegador no permite geolocalización');return;}
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude:la,longitude:lo}=pos.coords;
    if(userMarker) map.removeLayer(userMarker);
    userMarker=L.circleMarker([la,lo],{radius:9,color:'#fff',weight:2,fillColor:'#c2410c',fillOpacity:1}).addTo(map);
    map.setView([la,lo],12);
    const dist=b=>Math.hypot(b.lat-la,b.lng-lo);
    const list=visibleBars().sort((a,b)=>dist(a)-dist(b));
    $('#results').innerHTML=list.map(b=>cardHTML(b)).join('');
    document.querySelectorAll('.card').forEach(c=>c.addEventListener('click',()=>goToBar(c.dataset.id)));
    toast('Ordenado por distancia desde tu ubicación');
  },()=>toast('No se pudo obtener tu ubicación'));
}

/* ---------- URL state ---------- */
function writeURL(){
  const p=new URLSearchParams();
  if(MODE==='cervezas')p.set('vista','cervezas');
  if(state.q)p.set('q',state.q);
  const chipSet=state[CFG.chipState];
  if(chipSet.size)p.set(MODE==='cervezas'?'tipos':'precios',[...chipSet].join('|'));
  if(state.vmin)p.set('vmin',state.vmin);
  if(state.rmin)p.set('rmin',state.rmin);
  if(state.nmin)p.set(CFG.minParam,state.nmin);
  if(state.orden!=='relevancia')p.set('orden',state.orden);
  if(state.juego)p.set('juego',state.juego.nombre);
  const c=map.getCenter();
  p.set('lat',c.lat.toFixed(5));p.set('lng',c.lng.toFixed(5));p.set('z',map.getZoom());
  history.replaceState(null,'',location.pathname+'?'+p.toString());
}
function readURL(){
  const p=new URLSearchParams(location.search);
  state.q=p.get('q')||''; $('#nameSearch').value=state.q;
  (p.get(MODE==='cervezas'?'tipos':'precios')||'').split('|').filter(Boolean).forEach(v=>state[CFG.chipState].add(v));
  state.vmin=+(p.get('vmin')||0); state.rmin=+(p.get('rmin')||0); state.nmin=+(p.get(CFG.minParam)||0);
  state.orden=p.get('orden')||'relevancia';
  $('#fVmin').value=state.vmin;$('#outVmin').textContent=state.vmin+'★';
  $('#fRmin').value=state.rmin;$('#outRmin').textContent=state.rmin;
  $('#fNmin').value=state.nmin;$('#fOrden').value=state.orden;
  document.querySelectorAll('#chipsFiltro .chip').forEach(ch=>{
    if(state[CFG.chipState].has(ch.dataset.v))ch.classList.add('on');
  });
  const jn=p.get('juego');
  if(jn && CFG.hasGameSearch){const j=JUEGOS.find(x=>normTxt(x.nombre)===normTxt(jn))||gameMatches(jn)[0]; if(j)selectGame(j);}
  if(p.get('lat'))map.setView([+p.get('lat'),+p.get('lng')],+p.get('z')||6);
  map.on('moveend',writeURL);
}

start();
