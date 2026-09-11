/* Board Games Finder España */
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

let BARES = [], JUEGOS = [];
let markers = {}, map, userMarker = null;

const state = {
  q:'', precios:new Set(),
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
  map = L.map('map', {zoomControl:false}).setView([40.2,-3.4], 6);
  L.control.zoom({position:'bottomright'}).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contribuidores', maxZoom:19
  }).addTo(map);
  const bounds = L.latLngBounds(BARES.map(b=>[b.lat,b.lng]));
  map.fitBounds(bounds, {padding:[30,30]});
}

function pinIcon(b){
  return L.divIcon({className:'', iconSize:[30,30], iconAnchor:[15,28], popupAnchor:[0,-26],
    html:`<div class="pin" style="width:30px;height:30px"><span>${b.valoracion.toFixed(1)}</span></div>`});
}

/* ---------- Filters UI ---------- */
function buildFilters(){
  const orden = {gratis:0, consumicion:1, cover:2, club:3, desconocido:4};
  const precios=[...new Set(BARES.map(b=>b.precio))].sort((a,b)=>(orden[a]??9)-(orden[b]??9));
  const el=$('#chipsPrecio');
  el.innerHTML = precios.map(v=>`<button class="chip" data-v="${v}">${PRECIO[v]}</button>`).join('');
  el.querySelectorAll('.chip').forEach(ch=>ch.addEventListener('click',()=>{
    const v=ch.dataset.v;
    state.precios.has(v)?state.precios.delete(v):state.precios.add(v);
    ch.classList.toggle('on'); apply(); writeURL();
  }));
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
function clearGame(){
  state.juego=null; $('#gameInput').value=''; $('#gsClear').style.display='none';
  $('#gameBanner').classList.remove('show'); apply(); writeURL();
}

/* ---------- Filter + render ---------- */
function visibleBars(){
  let list=BARES.filter(b=>{
    if(state.juego && !state.juego.bares[b.id]) return false;
    if(state.q){
      const nq=normTxt(state.q);
      if(!normTxt(b.nombre).includes(nq) && !normTxt(b.ciudad||'').includes(nq) && !normTxt(b.zona||'').includes(nq)) return false;
    }
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
  if(state.q)p.set('q',state.q);
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
  (p.get('precios')||'').split('|').filter(Boolean).forEach(v=>state.precios.add(v));
  state.vmin=+(p.get('vmin')||0); state.rmin=+(p.get('rmin')||0); state.jmin=+(p.get('jmin')||0);
  state.orden=p.get('orden')||'relevancia';
  $('#fVmin').value=state.vmin;$('#outVmin').textContent=state.vmin+'★';
  $('#fRmin').value=state.rmin;$('#outRmin').textContent=state.rmin;
  $('#fJmin').value=state.jmin;$('#fOrden').value=state.orden;
  document.querySelectorAll('.chip').forEach(ch=>{
    if(state.precios.has(ch.dataset.v))ch.classList.add('on');
  });
  const jn=p.get('juego');
  if(jn){const j=JUEGOS.find(x=>normTxt(x.nombre)===normTxt(jn))||gameMatches(jn)[0]; if(j)selectGame(j);}
  if(p.get('lat'))map.setView([+p.get('lat'),+p.get('lng')],+p.get('z')||6);
  map.on('moveend',writeURL);
}
