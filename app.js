/* Board Games Finder Madrid */
'use strict';

const TIPOS_LOCAL = {
  'cafe-juegos':   {label:'Café de juegos',  color:'#7c5cff'},
  'bar-juegos':    {label:'Bar de juegos',   color:'#e0509b'},
  'cafe-con-juegos':{label:'Café con juegos', color:'#2e9e8f'},
  'pub-con-juegos':{label:'Pub con juegos',  color:'#c77700'},
  'gaming-bar':    {label:'Gaming bar',      color:'#3a7bd5'},
  'chess-bar':     {label:'Bar de ajedrez',  color:'#5a5f73'},
  'club':          {label:'Club asociativo', color:'#1f9d63'},
};
const TIPOS_JUEGO = {
  estrategia:'Estrategia', tematico:'Temáticos', party:'Party / Fiesta', familiar:'Familiares',
  infantil:'Infantiles', cartas:'Cartas', abstracto:'Abstractos', wargames:'Wargames',
  rol:'Rol', ajedrez:'Ajedrez', filler:'Filler', parejas:'Para 2'
};
const PRECIO = {
  gratis:{label:'Gratis'}, consumicion:{label:'Con tu consumición'},
  cover:{label:'Cover (tarifa de juego)'}, club:{label:'Cuota de club'}, desconocido:{label:'Sin datos'}
};
const FUENTE_BADGE = { 'catalogo-web':['Confirmado en catálogo web','ok'], 'estimado':['Dato estimado','est'], 'desconocido':['Sin datos','est'], 'sin-catalogo':['Catálogo no publicado','est'] };

let BARES = [], JUEGOS = [];
let markers = {}, map, userMarker = null;

const state = {
  q:'', zonas:new Set(), tipos:new Set(), juegos:new Set(), precios:new Set(),
  vmin:0, rmin:0, jmin:0, orden:'relevancia', juego:null
};

/* ---------- Utils ---------- */
const $ = s => document.querySelector(s);
const normTxt = s => (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const fmtN = n => n==null ? null : n.toLocaleString('es-ES');
function score(b, C, m){ return (b.resenas/(b.resenas+m))*b.valoracion + (m/(b.resenas+m))*C; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }

/* ---------- Init ---------- */
Promise.all([fetch('bares.json').then(r=>r.json()), fetch('juegos.json').then(r=>r.json())]).then(([bares, juegos])=>{
  BARES = bares; JUEGOS = juegos;
  initMap(); buildFilters(); readURL(); apply();
  bindUI();
});

function initMap(){
  map = L.map('map', {zoomControl:false}).setView([40.4215,-3.7025], 13);
  L.control.zoom({position:'bottomright'}).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contribuidores', maxZoom:19
  }).addTo(map);
  const used = new Set();
  BARES.forEach(b=>used.add(b.tipo));
  $('#legend').innerHTML = [...used].map(t=>`<div class="l-item"><span class="dot" style="background:${TIPOS_LOCAL[t].color}"></span>${TIPOS_LOCAL[t].label}</div>`).join('');
}

function pinIcon(b){
  const c = TIPOS_LOCAL[b.tipo].color;
  const label = b.valoracion.toFixed(1);
  return L.divIcon({className:'', iconSize:[34,34], iconAnchor:[17,32], popupAnchor:[0,-30],
    html:`<div class="pin" style="background:${c};width:34px;height:34px"><span>${label}</span></div>`});
}

/* ---------- Filters UI ---------- */
function chipRow(el, values, labelFn, set){
  el.innerHTML = values.map(v=>`<button class="chip" data-v="${v}">${labelFn(v)}</button>`).join('');
  el.querySelectorAll('.chip').forEach(ch=>ch.addEventListener('click',()=>{
    const v=ch.dataset.v;
    set.has(v)?set.delete(v):set.add(v);
    ch.classList.toggle('on'); apply(); writeURL();
  }));
}
function buildFilters(){
  const zonas=[...new Set(BARES.map(b=>b.zona))].sort();
  chipRow($('#chipsZona'), zonas, z=>z, state.zonas);
  const tipos=[...new Set(BARES.map(b=>b.tipo))];
  chipRow($('#chipsTipo'), tipos, t=>TIPOS_LOCAL[t].label, state.tipos);
  const jts=[...new Set(BARES.flatMap(b=>b.tipos_juego))];
  chipRow($('#chipsJuegos'), jts, t=>TIPOS_JUEGO[t]||t, state.juegos);
  const precios=[...new Set(BARES.map(b=>b.precio))];
  chipRow($('#chipsPrecio'), precios, p=>PRECIO[p].label, state.precios);
}

function bindUI(){
  $('#nameSearch').addEventListener('input',e=>{state.q=e.target.value.trim();apply();writeURL();});
  $('#fVmin').addEventListener('input',e=>{state.vmin=+e.target.value;$('#outVmin').textContent=state.vmin+'★';apply();writeURL();});
  $('#fRmin').addEventListener('input',e=>{state.rmin=+e.target.value;$('#outRmin').textContent=state.rmin;apply();writeURL();});
  $('#fJmin').addEventListener('change',e=>{state.jmin=+e.target.value;apply();writeURL();});
  $('#fOrden').addEventListener('change',e=>{state.orden=e.target.value;apply();writeURL();});
  $('#btnShare').addEventListener('click',()=>{
    navigator.clipboard.writeText(location.href).then(()=>toast('Enlace copiado con los filtros actuales'));
  });
  $('#btnNear').addEventListener('click',nearMe);
  $('#bannerClear').addEventListener('click',clearGame);
  $('#gsClear').addEventListener('click',clearGame);
  // game search
  const gi=$('#gameInput'), dd=$('#gsDropdown');
  gi.addEventListener('input',()=>{ renderGameDropdown(gi.value); });
  gi.addEventListener('focus',()=>{ if(gi.value.trim().length>=2) dd.style.display='block'; });
  document.addEventListener('click',e=>{ if(!e.target.closest('.game-search')) dd.style.display='none'; });
  // sheet drag (mobile)
  const sheet=$('#sidebar'), handle=$('#sheetHandle');
  let startY=null, dragging=false;
  handle.addEventListener('pointerdown',e=>{dragging=true;startY=e.clientY;handle.setPointerCapture(e.pointerId);});
  handle.addEventListener('pointerup',e=>{
    if(!dragging)return; dragging=false;
    const dy=e.clientY-startY;
    if(dy>40) sheet.classList.add('collapsed'); else if(dy<-40) sheet.classList.remove('collapsed');
  });
  handle.addEventListener('click',()=>sheet.classList.toggle('collapsed'));
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
  // agrupa por familia
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
      html+=`<div class="gs-item" data-i="${idx}"><div class="nm">${j.nombre}</div><div class="meta"><span>📍 ${barNames.join(' · ')}</span>${badges}${extra?`<span>${extra}</span>`:''}</div></div>`;
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
function clearGame(){
  state.juego=null; $('#gameInput').value=''; $('#gsClear').style.display='none';
  $('#gameBanner').classList.remove('show'); apply(); writeURL();
}

/* ---------- Filter + render ---------- */
function visibleBars(){
  let list=BARES.filter(b=>{
    if(state.juego && !state.juego.bares[b.id]) return false;
    if(state.q && !normTxt(b.nombre).includes(normTxt(state.q))) return false;
    if(state.zonas.size && !state.zonas.has(b.zona)) return false;
    if(state.tipos.size && !state.tipos.has(b.tipo)) return false;
    if(state.juegos.size && ![...state.juegos].every(t=>b.tipos_juego.includes(t))) return false;
    if(state.precios.size && !state.precios.has(b.precio)) return false;
    if(b.valoracion < state.vmin) return false;
    if(b.resenas < state.rmin) return false;
    if(state.jmin>0 && (b.num_juegos==null || b.num_juegos < state.jmin)) return false;
    return true;
  });
  const C=BARES.reduce((s,b)=>s+b.valoracion,0)/BARES.length, m=100;
  const S={relevancia:b=>-score(b,C,m), valoracion:b=>-b.valoracion, resenas:b=>-b.resenas, juegos:b=>-(b.num_juegos||0), nombre:b=>b.nombre};
  list.sort((a,b2)=>{const f=S[state.orden];const r=f(a)-f(b2);return isNaN(r)?String(a.nombre).localeCompare(String(b2.nombre)):r;});
  return list;
}

function apply(){
  const list=visibleBars();
  // markers
  Object.values(markers).forEach(mk=>map.removeLayer(mk)); markers={};
  list.forEach(b=>{
    const mk=L.marker([b.lat,b.lng],{icon:pinIcon(b)}).addTo(map);
    mk.bindPopup(popupHTML(b),{maxWidth:320});
    mk.on('click',()=>highlightCard(b.id));
    markers[b.id]=mk;
  });
  // cards
  $('#results').innerHTML=list.map(b=>cardHTML(b)).join('');
  $('#count').textContent=`Mostrando ${list.length} de ${BARES.length} locales`;
  document.querySelectorAll('.card').forEach(c=>c.addEventListener('click',()=>{
    const id=c.dataset.id, b=BARES.find(x=>x.id===id);
    highlightCard(id);
    map.setView([b.lat,b.lng],16,{animate:true});
    markers[id].openPopup();
    if(window.innerWidth<=900) $('#sidebar').classList.add('collapsed');
  }));
}
function highlightCard(id){
  document.querySelectorAll('.card').forEach(c=>c.classList.toggle('active',c.dataset.id===id));
  const el=document.querySelector(`.card[data-id="${id}"]`);
  if(el) el.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function tagChips(b){
  const t=b.tipos_juego.slice(0,4).map(x=>`<span class="mini">${TIPOS_JUEGO[x]||x}</span>`).join('');
  return t;
}
function cardHTML(b){
  const nj = b.num_juegos!=null ? `${fmtN(b.num_juegos)} juegos` : 'Catálogo no publicado';
  const ev = b.num_juegos_fuente==='catalogo-web' ? '' : ' <span class="score-flag">(estimado)</span>';
  return `<div class="card" data-id="${b.id}">
    <h3>${b.nombre}</h3>
    <div class="tipo">${TIPOS_LOCAL[b.tipo].label} · ${b.zona}</div>
    <div class="sub"><span class="stars">★ ${b.valoracion.toFixed(1)}</span> <span class="reviews">(${fmtN(b.resenas)} reseñas)</span> · ${nj}${ev}</div>
    <div class="tags">${tagChips(b)}</div>
  </div>`;
}
function popupHTML(b){
  const nj = b.num_juegos!=null
    ? `<div class="row"><b>Juegos</b><span>${fmtN(b.num_juegos)} ${b.num_juegos_fuente==='catalogo-web'?'<span class="badge ok">Confirmado en catálogo web</span>':''}</span></div>`
    : `<div class="row"><b>Juegos</b><span class="nodata">Catálogo no publicado</span></div>`;
  const pEv = FUENTE_BADGE[b.precio_evidencia] || FUENTE_BADGE.estimado;
  const precio = `<div class="row"><b>Precio</b><span>${b.precio_detalle} <span class="badge ${pEv[1]}">${pEv[0]}</span></span></div>`;
  const juegoInfo = state.juego && state.juego.bares[b.id]
    ? `<div class="row"><b>Tu juego</b><span>✅ ${state.juego.nombre} disponible <span class="badge ok">Confirmado en catálogo web</span></span></div>` : '';
  const webBtn = b.web ? `<a class="btn-web" href="${b.web}" target="_blank" rel="noopener">Web</a>` : '';
  return `<div class="pop">
    <h3>${b.nombre}</h3>
    <div class="tipo-zona">${TIPOS_LOCAL[b.tipo].label} · ${b.zona}</div>
    <div class="dir">${b.direccion} — ${b.distrito}</div>
    <div class="row"><b>Valoración</b><span><span class="stars">★ ${b.valoracion.toFixed(1)}</span> <span class="reviews">(${fmtN(b.resenas)} reseñas en Google)</span></span></div>
    ${precio}${nj}${juegoInfo}
    <div class="row"><b>Ambiente</b><span>${b.ambiente.join(', ')}</span></div>
    <div style="font-size:12.5px;color:#3a4560;margin-top:6px">${b.descripcion}</div>
    <div class="tags">${b.tipos_juego.map(x=>`<span class="mini">${TIPOS_JUEGO[x]||x}</span>`).join('')}${b.tipos_evidencia==='estimado'?'<span class="badge est">Tipos estimados</span>':''}</div>
    <div class="btns"><a class="btn-maps" href="${b.maps_url}" target="_blank" rel="noopener">Cómo llegar (Google Maps)</a>${webBtn}</div>
  </div>`;
}

/* ---------- Near me ---------- */
function nearMe(){
  if(!navigator.geolocation){toast('Tu navegador no permite geolocalización');return;}
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude:la,longitude:lo}=pos.coords;
    if(userMarker) map.removeLayer(userMarker);
    userMarker=L.circleMarker([la,lo],{radius:9,color:'#fff',weight:2,fillColor:'#1a73e8',fillOpacity:1}).addTo(map);
    map.setView([la,lo],14);
    const C=BARES.reduce((s,b)=>s+b.valoracion,0)/BARES.length, m=100;
    const dist=b=>Math.hypot(b.lat-la,b.lng-lo);
    // reordena tarjetas por distancia temporalmente
    const list=visibleBars().sort((a,b)=>dist(a)-dist(b));
    $('#results').innerHTML=list.map(b=>cardHTML(b)).join('');
    document.querySelectorAll('.card').forEach(c=>c.addEventListener('click',()=>{
      const id=c.dataset.id, b=BARES.find(x=>x.id===id);
      highlightCard(id); map.setView([b.lat,b.lng],16,{animate:true}); markers[id].openPopup();
    }));
    toast('Ordenado por distancia desde tu ubicación');
  },()=>toast('No se pudo obtener tu ubicación'));
}

/* ---------- URL state ---------- */
function writeURL(){
  const p=new URLSearchParams();
  if(state.q)p.set('q',state.q);
  if(state.zonas.size)p.set('zonas',[...state.zonas].join('|'));
  if(state.tipos.size)p.set('tipos',[...state.tipos].join('|'));
  if(state.juegos.size)p.set('juegos',[...state.juegos].join('|'));
  if(state.precios.size)p.set('precios',[...state.precios].join('|'));
  if(state.vmin)p.set('vmin',state.vmin);
  if(state.rmin)p.set('rmin',state.rmin);
  if(state.jmin)p.set('jmin',state.jmin);
  if(state.orden!=='relevancia')p.set('orden',state.orden);
  if(state.juego)p.set('juego',state.juego.nombre);
  const c=map.getCenter();
  p.set('lat',c.lat.toFixed(5));p.set('lng',c.lng.toFixed(5));p.set('z',map.getZoom());
  history.replaceState(null,'',location.pathname+'?'+p.toString());
}
function readURL(){
  const p=new URLSearchParams(location.search);
  state.q=p.get('q')||''; $('#nameSearch').value=state.q;
  (p.get('zonas')||'').split('|').filter(Boolean).forEach(v=>state.zonas.add(v));
  (p.get('tipos')||'').split('|').filter(Boolean).forEach(v=>state.tipos.add(v));
  (p.get('juegos')||'').split('|').filter(Boolean).forEach(v=>state.juegos.add(v));
  (p.get('precios')||'').split('|').filter(Boolean).forEach(v=>state.precios.add(v));
  state.vmin=+(p.get('vmin')||0); state.rmin=+(p.get('rmin')||0); state.jmin=+(p.get('jmin')||0);
  state.orden=p.get('orden')||'relevancia';
  $('#fVmin').value=state.vmin;$('#outVmin').textContent=state.vmin+'★';
  $('#fRmin').value=state.rmin;$('#outRmin').textContent=state.rmin;
  $('#fJmin').value=state.jmin;$('#fOrden').value=state.orden;
  document.querySelectorAll('.chip').forEach(ch=>{
    const v=ch.dataset.v;
    if(state.zonas.has(v)||state.tipos.has(v)||state.juegos.has(v)||state.precios.has(v))ch.classList.add('on');
  });
  const jn=p.get('juego');
  if(jn){const j=JUEGOS.find(x=>normTxt(x.nombre)===normTxt(jn))||gameMatches(jn)[0]; if(j)selectGame(j);}
  if(p.get('lat'))map.setView([+p.get('lat'),+p.get('lng')],+p.get('z')||13);
  map.on('moveend',writeURL);
}
