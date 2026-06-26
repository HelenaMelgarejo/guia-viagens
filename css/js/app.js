const STORE = 'guia-viagens-clean-v1';

const flagMap = {
  'italia':'it','itália':'it','franca':'fr','frança':'fr','paris':'fr','estados unidos':'us','eua':'us','usa':'us',
  'japao':'jp','japão':'jp','portugal':'pt','espanha':'es','reino unido':'gb','inglaterra':'gb','brasil':'br',
  'ucrania':'ua','ucrânia':'ua','ukraine':'ua','kiev':'ua','kyiv':'ua','alemanha':'de','grecia':'gr','grécia':'gr'
};

const cityPhoto = {
  'roma':'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=80',
  'florenca':'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=1200&q=80',
  'florença':'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=1200&q=80',
  'veneza':'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&q=80',
  'milao':'https://images.unsplash.com/photo-1512238701577-f182d9ef8af7?auto=format&fit=crop&w=1200&q=80',
  'milão':'https://images.unsplash.com/photo-1512238701577-f182d9ef8af7?auto=format&fit=crop&w=1200&q=80',
  'pisa':'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80',
  'paris':'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  'nova york':'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1200&q=80',
  'new york':'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1200&q=80',
  'londres':'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
  'tokyo':'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
  'tóquio':'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
  'lisboa':'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80',
  'barcelona':'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80',
  'madrid':'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80'
};

const countryPhoto = {
  'italia': cityPhoto.roma, 'itália': cityPhoto.roma,
  'franca': cityPhoto.paris, 'frança': cityPhoto.paris,
  'eua': cityPhoto['nova york'], 'estados unidos': cityPhoto['nova york'],
  'portugal': cityPhoto.lisboa, 'espanha': cityPhoto.barcelona
};

let db = loadDB();
let activeTripId = null;

function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function norm(s){ return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function esc(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function defaultCurrencies(){
  return [
    {code:'BRL', symbol:'R$', name:'Real Brasileiro'},
    {code:'EUR', symbol:'€', name:'Euro'},
    {code:'USD', symbol:'US$', name:'Dólar Americano'}
  ];
}

function emptyTrip(overrides={}){
  return {
    id: uid(),
    name: 'Nova viagem',
    country: '',
    cities: '',
    start: '',
    end: '',
    status: 'Planejada',
    photo: '',
    photoManual: false,
    archived: false,
    events: [],
    expenses: [],
    savings: [],
    tickets: [],
    docs: [],
    checks: [],
    currencies: defaultCurrencies(),
    rates: {},
    ...overrides
  };
}

function loadDB(){
  const saved = localStorage.getItem(STORE);
  if(saved){
    try{ return normalizeDB(JSON.parse(saved)); }catch(e){}
  }
  const sample = emptyTrip({
    name:'Itália 2026',
    country:'Itália',
    cities:'Roma, Florença, Veneza',
    start:'18/09/2026',
    end:'29/09/2026'
  });
  return {activeTripId:null, trips:[sample]};
}

function normalizeDB(data){
  let trips = Array.isArray(data.trips) ? data.trips : [];
  trips = trips.map(t => ({
    ...emptyTrip(),
    ...t,
    id: t.id || uid(),
    events: Array.isArray(t.events) ? t.events : [],
    expenses: Array.isArray(t.expenses) ? t.expenses : [],
    savings: Array.isArray(t.savings) ? t.savings : [],
    tickets: Array.isArray(t.tickets) ? t.tickets : [],
    docs: Array.isArray(t.docs) ? t.docs : [],
    checks: Array.isArray(t.checks) ? t.checks : [],
    currencies: Array.isArray(t.currencies) && t.currencies.length ? t.currencies : defaultCurrencies(),
    rates: t.rates || {}
  }));
  if(!trips.length){
    const sample = emptyTrip({name:'Itália 2026',country:'Itália',cities:'Roma, Florença, Veneza',start:'18/09/2026',end:'29/09/2026'});
    trips = [sample];
  }
  return {activeTripId:data.activeTripId || null, trips};
}

function save(){
  db.activeTripId = null;
  localStorage.setItem(STORE, JSON.stringify(db));
}

function trip(){
  return db.trips.find(t => t.id === activeTripId) || null;
}
function requireTrip(){
  const t = trip();
  if(!t){
    alert('Selecione uma viagem primeiro.');
    showTab('dashboard');
    return null;
  }
  return t;
}

function selectTrip(id){
  activeTripId = id;
  clearSearch();
  showTab('dashboard');
  renderAll();
}

function getCurrency(code){
  const t = trip();
  return (t?.currencies || defaultCurrencies()).find(c => c.code === code) || {code, symbol:code, name:code};
}

function fmt(amount, code='BRL'){
  const c = getCurrency(code);
  return `${c.symbol} ${Number(amount||0).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})}`;
}

function brl(n){
  return Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

function maskDate(v){
  const d = String(v||'').replace(/\D/g,'').slice(0,8);
  if(d.length <= 2) return d;
  if(d.length <= 4) return d.slice(0,2)+'/'+d.slice(2);
  return d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4);
}

function maskTime(v){
  const d = String(v||'').replace(/\D/g,'').slice(0,4);
  if(d.length <= 2) return d;
  return d.slice(0,2)+':'+d.slice(2);
}

function bindMasks(){
  document.querySelectorAll('[data-date]').forEach(i=>{
    if(i.dataset.bound) return;
    i.dataset.bound = '1';
    i.addEventListener('input',()=>i.value=maskDate(i.value));
  });
  document.querySelectorAll('[data-time]').forEach(i=>{
    if(i.dataset.bound) return;
    i.dataset.bound = '1';
    i.addEventListener('input',()=>i.value=maskTime(i.value));
  });
}

function parseDateBR(s){
  const [d,m,y] = String(s||'').split('/').map(Number);
  if(!d || !m || !y) return null;
  return new Date(y,m-1,d);
}

function tripDays(start,end){
  const a=parseDateBR(start), b=parseDateBR(end);
  if(!a || !b) return 0;
  return Math.max(1, Math.round((b-a)/86400000)+1);
}

function daysUntil(start){
  const d = parseDateBR(start);
  if(!d) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  return Math.max(0, Math.ceil((d-today)/86400000));
}

function flagFor(country){
  const code = flagMap[norm(country)] || (norm(country).includes('ital')?'it':norm(country).includes('fran')?'fr':'');
  return code ? `https://flagcdn.com/w160/${code}.png` : '';
}

function photoFor(t){
  if(t.photoManual && t.photo) return t.photo;
  const cityKeys = String(t.cities||'').split(',').map(norm).filter(Boolean);
  for(const key of cityKeys){
    if(cityPhoto[key]) return cityPhoto[key];
    for(const known of Object.keys(cityPhoto)){
      const nk = norm(known);
      if(key.includes(nk) || nk.includes(key)) return cityPhoto[known];
    }
  }
  const nameKey = norm(t.name);
  for(const known of Object.keys(cityPhoto)){
    if(nameKey.includes(norm(known))) return cityPhoto[known];
  }
  const countryKey = norm(t.country);
  if(countryPhoto[countryKey]) return countryPhoto[countryKey];
  if(countryKey.includes('ital')) return countryPhoto.italia;
  if(countryKey.includes('fran')) return countryPhoto.franca;
  if(countryKey.includes('eua') || countryKey.includes('usa') || countryKey.includes('estados unidos')) return countryPhoto.eua;
  return '';
}

function makeCoverPlaceholder(label, icon='🌍'){
  const d=document.createElement('div');
  d.className='trip-cover placeholder-cover';
  d.innerHTML = `${icon}<span>${label}</span>`;
  return d;
}

function iconSVG(type){
  const icons = {
    expense:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>',
    saving:'<svg viewBox="0 0 24 24"><path d="M5 12a6 6 0 0 1 6-6h4a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2"/><path d="M8 9h.01"/><path d="M16 6l1-3"/></svg>',
    wallet:'<svg viewBox="0 0 24 24"><path d="M4 7h16v13H4z"/><path d="M16 12h5v4h-5z"/><path d="M4 7l3-4h12"/></svg>',
    calendar:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M3 10h18"/></svg>',
    hourglass:'<svg viewBox="0 0 24 24"><path d="M6 3h12"/><path d="M6 21h12"/><path d="M8 3c0 5 8 5 8 9s-8 4-8 9"/><path d="M16 3c0 5-8 5-8 9s8 4 8 9"/></svg>',
    pin:'<svg viewBox="0 0 24 24"><path d="M12 21s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    ticket:'<svg viewBox="0 0 24 24"><path d="M4 9a3 3 0 0 0 0 6v3h16v-3a3 3 0 0 0 0-6V6H4v3Z"/><path d="M9 8v8"/></svg>',
    doc:'<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    globe:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3.5 3 14 0 18"/><path d="M12 3c-3 3.5-3 14 0 18"/></svg>'
  };
  return icons[type] || icons.globe;
}

function applyIcons(){
  document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML = iconSVG(el.dataset.icon));
}

function item(icon,title,sub,actions=''){
  return `<div class="item"><div class="item-icon">${iconSVG(icon)}</div><div><h4>${title}</h4><p>${sub||''}</p></div><div class="actions">${actions}</div></div>`;
}

function empty(msg='Nada lançado nesta viagem.'){
  return `<div class="empty">${msg}</div>`;
}

function clearSearch(){
  const s=document.getElementById('search');
  if(s) s.value='';
}

function qfilter(arr,fields){
  const q = norm(document.getElementById('search')?.value || '');
  if(!q) return arr;
  return arr.filter(x => fields.some(f => norm(x[f]).includes(q)));
}

function totalsByCurrency(list){
  const out = {};
  (list||[]).forEach(e=>{
    const c = e.currency || 'BRL';
    out[c] = (out[c]||0) + Number(e.amount||0);
  });
  return out;
}
function allCurrencyTotals(list){
  const out = {};
  const t = trip();
  (t?.currencies || defaultCurrencies()).forEach(c=>out[c.code]=0);
  const actual = totalsByCurrency(list);
  Object.keys(actual).forEach(k=>out[k]=actual[k]);
  return out;
}

function balanceByCurrency(t){
  const spent = totalsByCurrency(t.expenses);
  const saved = totalsByCurrency(t.savings);
  const out = {};
  new Set([...Object.keys(spent),...Object.keys(saved)]).forEach(k=>{
    out[k] = (saved[k]||0) - (spent[k]||0);
  });
  return out;
}

function totalsBRL(t){
  const spent = (t.expenses||[]).filter(e=>e.currency==='BRL').reduce((s,e)=>s+Number(e.amount||0),0);
  const saved = (t.savings||[]).filter(e=>e.currency==='BRL').reduce((s,e)=>s+Number(e.amount||0),0);
  return {spent,saved,balance:saved-spent};
}

function statPills(obj){
  const keys = Object.keys(obj);
  if(!keys.length) return '';
  return keys.map(k=>`<span class="stat-pill">${k}: <b>${fmt(obj[k],k)}</b></span>`).join('');
}

function currencyTotalsHTML(obj){
  const keys = Object.keys(obj);
  if(!keys.length) return '<div class="currency-totals"><span class="currency-pill">Nada lançado</span></div>';
  return '<div class="currency-totals">' + keys.map(k=>`<span class="currency-pill">${k}: <strong>${fmt(obj[k],k)}</strong></span>`).join('') + '</div>';
}

function showTab(tab){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.getElementById(tab)?.classList.add('active');
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  if(tab !== 'dashboard' && !trip()){
    document.querySelectorAll('[data-trip-note]').forEach(el=>el.textContent='Selecione uma viagem no dashboard primeiro.');
  }
}

function openModal(html){
  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalBg').classList.add('active');
  bindMasks();
}

function closeModal(){
  document.getElementById('modalBg').classList.remove('active');
}

document.getElementById('modalBg').addEventListener('click', e=>{
  if(e.target.id === 'modalBg') closeModal();
});


function todayBR(){
  return new Date().toLocaleDateString('pt-BR');
}
function renderToday(){
  const t = trip(); if(!t) return;
  const today = todayBR();
  const events = (t.events||[]).filter(e=>e.date===today).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  const expenses = (t.expenses||[]).filter(e=>e.date===today);
  const hero = document.getElementById('todayHero');
  if(hero){
    hero.innerHTML = `<div><span>Hoje • ${today}</span><br><strong>${t.name}</strong><br><span>${events.length} evento(s) no roteiro</span></div><div><strong>${daysUntil(t.start)} dias</strong><br><span>para viajar</span></div>`;
  }
  const ev = document.getElementById('todayEvents');
  if(ev) ev.innerHTML = events.length ? events.map(e=>item('pin', `${e.time||'--:--'} • ${e.name}`, `${e.category||''} • ${e.location||''}`, `<a class="maplink" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location||e.name)}">Maps</a>`)).join('') : empty('Nenhum evento com a data de hoje.');
  const ex = document.getElementById('todayExpenses');
  if(ex) ex.innerHTML = expenses.length ? expenses.map(e=>item('expense', e.name, e.category||'', `<span class="neg">-${fmt(e.amount,e.currency)}</span>`)).join('') : empty('Nenhum gasto lançado hoje.');
  const tx = document.getElementById('todayExpenseTotals');
  if(tx) tx.innerHTML = currencyTotalsHTML(totalsByCurrency(expenses));
}

function renderAll(){
  save();
  applyIcons();
  renderTrips();

  const hasTrip = !!trip();
  document.body.classList.toggle('trip-selected', hasTrip);
  document.getElementById('dashStats').style.display = hasTrip ? 'grid' : 'none';
  document.getElementById('dashDetails').style.display = hasTrip ? 'grid' : 'none';
  document.getElementById('noTripPanel').style.display = hasTrip ? 'none' : 'block';

  if(!hasTrip){
    const activeSection = document.querySelector('.section.active');
    if(activeSection && activeSection.id !== 'dashboard') showTab('dashboard');
    
    document.querySelectorAll('[data-trip-note]').forEach(el=>el.textContent = 'Selecione uma viagem no dashboard primeiro.');
    ['todayEvents','todayExpenses','eventsList','expensesList','savingsList','ticketsList','docsList','checksList','currenciesList','ratesList'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.innerHTML = empty('Selecione uma viagem primeiro.');
    });
    const th=document.getElementById('todayHero'); if(th) th.innerHTML='';
    const te=document.getElementById('todayExpenseTotals'); if(te) te.innerHTML='';
    const et=document.getElementById('expenseTotals'); if(et) et.innerHTML='';
    const st=document.getElementById('savingTotals'); if(st) st.innerHTML='';
    return;
  }

  renderSummary();
  renderDashboardLists();
  renderToday();
  renderEvents();
  renderExpenses();
  renderSavings();
  renderTickets();
  renderDocs();
  renderChecks();
  renderCurrencies();
  renderRates();
}

function renderTripCard(t, archived=false){
  const f = flagFor(t.country);
  const cover = photoFor(t);
  const fallbackLabel = t.country || t.name || 'Destino';
  const coverHTML = cover
    ? `<img class="trip-cover" src="${cover}" onerror="this.replaceWith(makeCoverPlaceholder('${esc(fallbackLabel)}'))">`
    : `<div class="trip-cover placeholder-cover">${f?'🏳️':'🌍'}<span>${esc(fallbackLabel)}</span></div>`;

  const div = document.createElement('div');
  div.className = 'trip ' + (t.id===activeTripId ? 'active ' : '') + (archived ? 'archived' : '');
  div.innerHTML = `
    ${f ? `<img class="trip-flag" src="${f}">` : ''}
    <button class="trip-menu" onclick="event.stopPropagation();openTripModal('${t.id}')">⋯</button>
    ${coverHTML}
    <div class="trip-body">
      <h3>${esc(t.name)}</h3>
      <p>${esc(t.cities || 'Sem cidades cadastradas')}</p>
      <p>🗓️ ${esc(t.start || '--/--/----')} - ${esc(t.end || '--/--/----')}</p>
      <span class="chip ${archived?'archived-chip':''}">${archived?'Arquivada':esc(t.status || 'Planejada')}</span>
    </div>
  `;
  if(!archived) div.onclick = ()=>selectTrip(t.id);
  return div;
}

function renderTrips(){
  const wrap = document.getElementById('trips');
  const archivedWrap = document.getElementById('archivedTrips');
  const archivedPanel = document.getElementById('archivedPanel');
  wrap.innerHTML = '';
  if(archivedWrap) archivedWrap.innerHTML = '';

  db.trips.filter(t=>!t.archived).forEach(t=>wrap.appendChild(renderTripCard(t,false)));

  const add = document.createElement('button');
  add.className = 'add-trip';
  add.onclick = ()=>openTripModal();
  add.innerHTML = '<div><span>＋</span>Adicionar viagem</div>';
  wrap.appendChild(add);

  const archived = db.trips.filter(t=>t.archived);
  if(archivedPanel) archivedPanel.style.display = archived.length ? 'block' : 'none';
  archived.forEach(t=>archivedWrap.appendChild(renderTripCard(t,true)));
}

function renderSummary(){
  const t = trip();
  const tt = totalsBRL(t);
  
  document.querySelectorAll('[data-trip-note]').forEach(el=>el.textContent = `Editando agora: ${t.name}`);

  document.getElementById('spentLabel').textContent = `Total gasto (${t.name})`;
  document.getElementById('spentTotal').textContent = brl(tt.spent);
  document.getElementById('savedTotal').textContent = brl(tt.saved);
  const totalChecks = (t.checks||[]).length;
  const doneChecks = (t.checks||[]).filter(c=>c.done).length;
  const checkPercent = totalChecks ? Math.round((doneChecks/totalChecks)*100) : 0;
  document.getElementById('checkProgressTotal').textContent = `${doneChecks}/${totalChecks}`;
  document.getElementById('checkProgressPill').innerHTML = totalChecks ? `<span class="stat-pill"><b>${checkPercent}%</b> concluído</span>` : '';
  document.getElementById('daysTotal').textContent = tripDays(t.start,t.end);
  document.getElementById('countdownTotal').textContent = `${daysUntil(t.start)} dias`;

  document.getElementById('spentByCurrency').innerHTML = statPills(totalsByCurrency(t.expenses));
  document.getElementById('savedByCurrency').innerHTML = statPills(totalsByCurrency(t.savings));


  document.getElementById('eventsTitle').textContent = `Próximos eventos (${t.name})`;
  document.getElementById('expensesTitle').textContent = `Últimos lançamentos (${t.name})`;
  document.getElementById('checksTitle').textContent = `Checklist (${t.name})`;
}

function renderDashboardLists(){
  const t = trip();
  document.getElementById('dashEvents').innerHTML = t.events.length
    ? t.events.slice(0,3).map(e=>item('pin', e.name, `${e.date||''} ${e.time||''} • ${e.location||''}`, `<button class="ghost" onclick="openEventModal('${e.id}')">Editar</button>`)).join('')
    : empty('Nenhum evento nesta viagem.');

  document.getElementById('dashExpenses').innerHTML = t.expenses.length
    ? t.expenses.slice(-4).reverse().map(e=>item('expense', e.name, `${e.date||''} • ${e.category||''}`, `<span class="neg">-${fmt(e.amount,e.currency)}</span>`)).join('')
    : empty('Nenhum gasto nesta viagem.');

  document.getElementById('dashChecks').innerHTML = t.checks.length
    ? t.checks.slice(0,5).map(c=>item('check', c.text, c.done?'Concluído':'Pendente', `<button class="ghost" onclick="toggleCheck('${c.id}')">${c.done?'Desmarcar':'Concluir'}</button>`)).join('')
    : empty('Nenhum checklist nesta viagem.');
}

function openTripModal(id=''){
  const editing = !!id;
  const t = editing ? db.trips.find(x=>x.id===id) : emptyTrip();
  const photoPreview = t.photoManual && t.photo ? `<img src="${t.photo}">` : 'Sem foto manual';

  openModal(`
    <h3>${editing?'Editar viagem':'Nova viagem'}</h3>
    <div class="form two">
      <input id="mName" placeholder="Nome da viagem" value="${t.name||''}">
      <input id="mCountry" placeholder="País" value="${t.country||''}">
    </div>
    <div class="form two" style="margin-top:10px">
      <input id="mCities" placeholder="Cidades. Ex: Roma, Florença, Veneza" value="${t.cities||''}">
      <select id="mStatus">
        <option>Planejada</option>
        <option>Em andamento</option>
        <option>Finalizada</option>
      </select>
    </div>
    <div class="form two" style="margin-top:10px">
      <input id="mStart" data-date inputmode="numeric" maxlength="10" placeholder="Início dd/mm/aaaa" value="${t.start||''}">
      <input id="mEnd" data-date inputmode="numeric" maxlength="10" placeholder="Fim dd/mm/aaaa" value="${t.end||''}">
    </div>

    <div style="margin-top:14px">
      <strong>Foto da viagem</strong>
      <p class="subnote" style="margin:6px 0 10px">Se enviar uma foto ou colar uma URL, ela tem prioridade sobre a foto automática.</p>
      <div class="photo-preview" id="photoPreview">${photoPreview}</div>
      <div class="form two" style="margin-top:10px">
        <input id="mPhotoUrl" placeholder="URL da foto manual" value="${t.photoManual && t.photo && !t.photo.startsWith('data:') ? t.photo : ''}">
        <input id="mPhotoFile" type="file" accept="image/*">
      </div>
      <div class="actions" style="margin-top:10px">
        <button class="ghost" onclick="previewTripPhoto()">Pré-visualizar URL</button>
        <button class="soft-btn" onclick="clearManualPhoto()">Usar foto automática</button>
      </div>
    </div>

    <div class="modal-actions">
      ${editing?`<button class="danger" onclick="deleteTrip('${id}')">Excluir viagem</button>`:''}
      ${editing && !t.archived ? `<button class="ghost" onclick="archiveTrip('${id}')">Arquivar viagem</button>` : ''}
      ${editing && t.archived ? `<button class="ghost" onclick="restoreTrip('${id}')">Restaurar viagem</button>` : ''}
      <button class="ghost" onclick="closeModal()">Cancelar</button>
      <button class="primary" onclick="saveTrip('${id}')">Salvar</button>
    </div>
  `);
  document.getElementById('mStatus').value = t.status || 'Planejada';
}

function previewTripPhoto(){
  const url = document.getElementById('mPhotoUrl').value.trim();
  const box = document.getElementById('photoPreview');
  box.innerHTML = url ? `<img src="${url}">` : 'Sem foto manual';
}

function clearManualPhoto(){
  document.getElementById('mPhotoUrl').value = '';
  document.getElementById('mPhotoFile').value = '';
  document.getElementById('photoPreview').innerHTML = 'Vai usar foto automática ou capa neutra.';
}

function saveTrip(id=''){
  const existing = id ? db.trips.find(x=>x.id===id) : null;
  const file = document.getElementById('mPhotoFile').files[0];
  const url = document.getElementById('mPhotoUrl').value.trim();

  const finish = (photoValue, manual)=>{
    const base = {
      name: document.getElementById('mName').value.trim() || 'Nova viagem',
      country: document.getElementById('mCountry').value.trim(),
      cities: document.getElementById('mCities').value.trim(),
      start: maskDate(document.getElementById('mStart').value),
      end: maskDate(document.getElementById('mEnd').value),
      status: document.getElementById('mStatus').value,
      photo: photoValue || '',
      photoManual: !!manual
    };

    if(existing){
      Object.assign(existing, base);
    }else{
      const nt = emptyTrip(base);
      db.trips.push(nt);
      activeTripId = nt.id;
    }
    if(base.status === 'Finalizada' && existing && !existing.archived){
      if(confirm('Essa viagem está finalizada. Quer arquivar agora?')) existing.archived = true;
    }
    if(base.status === 'Finalizada' && !existing){
      const nt = db.trips.find(x=>x.id===activeTripId);
      if(nt && confirm('Essa viagem está finalizada. Quer arquivar agora?')) nt.archived = true;
    }
    clearSearch();
    closeModal();
    renderAll();
  };

  if(file){
    const reader = new FileReader();
    reader.onload = ()=>finish(reader.result, true);
    reader.readAsDataURL(file);
  }else if(url){
    finish(url, true);
  }else{
    finish('', false);
  }
}

function archiveTrip(id){
  const t = db.trips.find(x=>x.id===id);
  if(!t) return;
  t.archived = true;
  if(activeTripId === id) activeTripId = null;
  closeModal();
  renderAll();
}

function restoreTrip(id){
  const t = db.trips.find(x=>x.id===id);
  if(!t) return;
  t.archived = false;
  closeModal();
  renderAll();
}

function deleteTrip(id){
  if(!confirm('Excluir esta viagem?')) return;
  db.trips = db.trips.filter(t=>t.id!==id);
  activeTripId = db.trips[0]?.id || null;
  if(!activeTripId){
    const nt = emptyTrip({name:'Nova viagem'});
    db.trips.push(nt);
    activeTripId = nt.id;
  }
  closeModal();
  renderAll();
}

function openEventModal(id=''){
  const t = requireTrip(); if(!t) return;
  const e = id ? t.events.find(x=>x.id===id) : {};
  openModal(`
    <h3>${id?'Editar lugar':'Adicionar lugar'} — ${t.name}</h3>
    <div class="form two">
      <input id="eName" placeholder="Lugar / atividade" value="${e.name||''}">
      <input id="eDate" data-date inputmode="numeric" maxlength="10" placeholder="Data dd/mm/aaaa" value="${e.date||''}">
    </div>
    <div class="form two" style="margin-top:10px">
      <input id="eTime" data-time inputmode="numeric" maxlength="5" placeholder="Horário" value="${e.time||''}">
      <select id="eCategory">
        <option>Passeio</option>
        <option>Transporte</option>
        <option>Hospedagem</option>
        <option>Alimentação</option>
        <option>Ingresso</option>
        <option>Compras</option>
        <option>Outro</option>
      </select>
    </div>
    <input id="eLoc" style="margin-top:10px" placeholder="Localização / endereço" value="${e.location||''}">
    <textarea id="eNotes" style="margin-top:10px" placeholder="Notas">${e.notes||''}</textarea>
    <div class="modal-actions">
      ${id?`<button class="danger" onclick="removeItem('events','${id}')">Excluir</button>`:''}
      <button class="ghost" onclick="closeModal()">Cancelar</button>
      <button class="primary" onclick="saveEvent('${id}')">Salvar</button>
    </div>
  `);
  const cat = document.getElementById('eCategory');
  if(cat) cat.value = e.category || 'Passeio';
}

function saveEvent(id=''){
  const t = trip();
  const arr = t.events;
  const obj = {
    id: id || uid(),
    name: document.getElementById('eName').value.trim() || 'Novo lugar',
    date: maskDate(document.getElementById('eDate').value),
    time: maskTime(document.getElementById('eTime').value),
    location: document.getElementById('eLoc').value.trim(),
    category: document.getElementById('eCategory')?.value || 'Passeio',
    notes: document.getElementById('eNotes').value.trim()
  };
  if(id){
    const found = arr.find(x=>x.id===id);
    found ? Object.assign(found,obj) : arr.push(obj);
  }else arr.push(obj);

  clearSearch();
  closeModal();
  showTab('roteiro');
  renderAll();
}

function renderEvents(){
  const arr = qfilter(trip().events, ['name','date','location','notes','category'])
    .slice()
    .sort((a,b)=>(parseDateBR(a.date)||0)-(parseDateBR(b.date)||0) || String(a.time||'').localeCompare(String(b.time||'')));
  const wrap = document.getElementById('eventsList');
  if(!arr.length){ wrap.innerHTML = empty('Nenhum lugar cadastrado nesta viagem.'); return; }
  let current = '';
  wrap.innerHTML = arr.map(e=>{
    const day = e.date || 'Sem data';
    const header = day !== current ? (current = day, `<div class="timeline-day">${day}</div>`) : '';
    return header + item('pin', `${e.time ? e.time+' • ' : ''}${e.name} <span class="category-chip">${e.category||'Passeio'}</span>`, `${e.location||''}`,
      `<a class="maplink" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location||e.name)}">Maps</a>
       <button class="ghost" onclick="openEventModal('${e.id}')">Editar</button>
       <button class="danger" onclick="removeItem('events','${e.id}')">Excluir</button>`);
  }).join('');
}

function currencyOptions(selected='BRL'){
  return trip().currencies.map(c=>`<option value="${c.code}" ${c.code===selected?'selected':''}>${c.code} ${c.symbol}</option>`).join('');
}

function openMoneyModal(kind,id=''){
  const t = requireTrip(); if(!t) return;
  const arr = kind==='expense' ? t.expenses : t.savings;
  const e = id ? arr.find(x=>x.id===id) : {currency:'BRL'};
  openModal(`
    <h3>${id?'Editar':'Adicionar'} ${kind==='expense'?'gasto':'valor guardado'} — ${t.name}</h3>
    <div class="form">
      <input id="mnName" placeholder="Nome" value="${e.name||''}">
      <input id="mnCat" placeholder="Categoria" value="${e.category||''}">
      <input id="mnAmount" type="number" step="0.01" placeholder="Valor" value="${e.amount||''}">
      <select id="mnCur">${currencyOptions(e.currency)}</select>
    </div>
    <input id="mnDate" data-date inputmode="numeric" maxlength="10" style="margin-top:10px" placeholder="Data dd/mm/aaaa" value="${e.date||''}">
    <div class="modal-actions">
      ${id?`<button class="danger" onclick="removeItem('${kind==='expense'?'expenses':'savings'}','${id}')">Excluir</button>`:''}
      <button class="ghost" onclick="closeModal()">Cancelar</button>
      <button class="primary" onclick="saveMoney('${kind}','${id}')">Salvar</button>
    </div>
  `);
}

function openExpenseModal(id=''){ openMoneyModal('expense',id); }
function openSavingModal(id=''){ openMoneyModal('saving',id); }

function saveMoney(kind,id=''){
  const arr = kind==='expense' ? trip().expenses : trip().savings;
  const obj = {
    id: id || uid(),
    name: document.getElementById('mnName').value.trim() || 'Lançamento',
    category: document.getElementById('mnCat').value.trim(),
    amount: Number(document.getElementById('mnAmount').value || 0),
    currency: document.getElementById('mnCur').value,
    date: maskDate(document.getElementById('mnDate').value)
  };
  if(id){
    const found = arr.find(x=>x.id===id);
    found ? Object.assign(found,obj) : arr.push(obj);
  }else arr.push(obj);

  clearSearch();
  closeModal();
  showTab('gastos');
  renderAll();
}

function renderExpenses(){
  const t = trip(); if(!t) return;
  const all = t.expenses;
  const arr = qfilter(all, ['name','category','date']);
  document.getElementById('expenseTotals').innerHTML = currencyTotalsHTML(totalsByCurrency(all));
  document.getElementById('expensesList').innerHTML = arr.length
    ? arr.map(e=>item('expense', e.name, `${e.date||''} • ${e.category||''}`,
      `<span class="neg">${fmt(e.amount,e.currency)}</span>
       <button class="ghost" onclick="openExpenseModal('${e.id}')">Editar</button>
       <button class="danger" onclick="removeItem('expenses','${e.id}')">Excluir</button>`)).join('')
    : empty('Nenhum gasto nesta viagem.');
}

function renderSavings(){
  const t = trip(); if(!t) return;
  const all = t.savings;
  const arr = qfilter(all, ['name','category','date']);
  document.getElementById('savingTotals').innerHTML = currencyTotalsHTML(totalsByCurrency(all));
  document.getElementById('savingsList').innerHTML = arr.length
    ? arr.map(e=>item('saving', e.name, `${e.date||''} • ${e.category||''}`,
      `<span class="money">${fmt(e.amount,e.currency)}</span>
       <button class="ghost" onclick="openSavingModal('${e.id}')">Editar</button>
       <button class="danger" onclick="removeItem('savings','${e.id}')">Excluir</button>`)).join('')
    : empty('Nenhum valor guardado nesta viagem.');
}

function openTicketModal(id=''){
  const t = requireTrip(); if(!t) return;
  const tk = id ? t.tickets.find(x=>x.id===id) : {currency:'BRL'};
  openModal(`
    <h3>${id?'Editar ingresso':'Adicionar ingresso'} — ${t.name}</h3>
    <div class="form">
      <input id="tkName" placeholder="Ingresso" value="${tk.name||''}">
      <input id="tkDate" data-date inputmode="numeric" maxlength="10" placeholder="Data dd/mm/aaaa" value="${tk.date||''}">
      <input id="tkAmount" type="number" step="0.01" placeholder="Valor" value="${tk.amount||''}">
      <select id="tkCur">${currencyOptions(tk.currency)}</select>
    </div>
    <input type="file" id="tkFile" style="margin-top:10px">
    <div class="modal-actions">
      ${id?`<button class="danger" onclick="removeItem('tickets','${id}')">Excluir</button>`:''}
      <button class="ghost" onclick="closeModal()">Cancelar</button>
      <button class="primary" onclick="saveTicket('${id}')">Salvar</button>
    </div>
  `);
}

function saveTicket(id=''){
  const arr = trip().tickets;
  const old = id ? arr.find(x=>x.id===id) : null;
  const file = document.getElementById('tkFile').files[0];

  const finish = (url='',name='')=>{
    const obj = {
      id: id || uid(),
      name: document.getElementById('tkName').value.trim() || 'Ingresso',
      date: maskDate(document.getElementById('tkDate').value),
      amount: Number(document.getElementById('tkAmount').value || 0),
      currency: document.getElementById('tkCur').value,
      file: url || old?.file || '',
      fileName: name || old?.fileName || ''
    };

    if(id){
      old ? Object.assign(old,obj) : arr.push(obj);
    }else{
      arr.push(obj);
      if(obj.amount > 0){
        trip().expenses.push({
          id: uid(),
          name: 'Ingresso: ' + obj.name,
          category: 'Ingresso',
          amount: obj.amount,
          currency: obj.currency,
          date: obj.date,
          ticketId: obj.id
        });
      }
    }

    clearSearch();
    closeModal();
    showTab('ingressos');
    renderAll();
  };

  if(file){
    const r = new FileReader();
    r.onload = ()=>finish(r.result,file.name);
    r.readAsDataURL(file);
  }else finish();
}

function renderTickets(){
  const t = trip(); if(!t) return;
  const arr = qfilter(t.tickets, ['name','date','fileName']);
  document.getElementById('ticketsList').innerHTML = arr.length
    ? arr.map(tk=>item('ticket', tk.name, `${tk.date||''} • ${fmt(tk.amount,tk.currency)} ${tk.fileName?'• '+tk.fileName:''}`,
      `${tk.file?`<button class="ghost" onclick="previewFile('${tk.file}')">Abrir</button>`:''}
       <button class="ghost" onclick="openTicketModal('${tk.id}')">Editar</button>
       <button class="danger" onclick="removeItem('tickets','${tk.id}')">Excluir</button>`)).join('')
    : empty('Nenhum ingresso nesta viagem.');
}

function openDocModal(id=''){
  const t = requireTrip(); if(!t) return;
  const d = id ? t.docs.find(x=>x.id===id) : {};
  openModal(`
    <h3>${id?'Editar documento':'Adicionar documento'} — ${t.name}</h3>
    <div class="form two">
      <input id="dName" placeholder="Nome do documento" value="${d.name||''}">
      <input id="dRef" placeholder="Refere-se a..." value="${d.ref||''}">
    </div>
    <input type="file" id="dFile" style="margin-top:10px">
    <div class="modal-actions">
      ${id?`<button class="danger" onclick="removeItem('docs','${id}')">Excluir</button>`:''}
      <button class="ghost" onclick="closeModal()">Cancelar</button>
      <button class="primary" onclick="saveDoc('${id}')">Salvar</button>
    </div>
  `);
}

function saveDoc(id=''){
  const arr = trip().docs;
  const old = id ? arr.find(x=>x.id===id) : null;
  const file = document.getElementById('dFile').files[0];

  const finish = (url='',name='')=>{
    const obj = {
      id: id || uid(),
      name: document.getElementById('dName').value.trim() || 'Documento',
      ref: document.getElementById('dRef').value.trim(),
      file: url || old?.file || '',
      fileName: name || old?.fileName || ''
    };
    if(id){
      old ? Object.assign(old,obj) : arr.push(obj);
    }else arr.push(obj);

    clearSearch();
    closeModal();
    showTab('documentos');
    renderAll();
  };

  if(file){
    const r = new FileReader();
    r.onload = ()=>finish(r.result,file.name);
    r.readAsDataURL(file);
  }else finish();
}

function previewFile(data){
  showTab('documentos');
  const box = document.getElementById('preview');
  if(String(data).startsWith('data:image')){
    box.innerHTML = `<img src="${data}">`;
  }else{
    box.innerHTML = `<iframe src="${data}"></iframe>`;
  }
}

function renderDocs(){
  const t = trip(); if(!t) return;
  const arr = qfilter(t.docs, ['name','ref','fileName']);
  document.getElementById('docsList').innerHTML = arr.length
    ? arr.map(d=>item('doc', d.name, `${d.ref||''} ${d.fileName?'• '+d.fileName:''}`,
      `${d.file?`<button class="ghost" onclick="previewFile('${d.file}')">Abrir</button>`:''}
       <button class="ghost" onclick="openDocModal('${d.id}')">Editar</button>
       <button class="danger" onclick="removeItem('docs','${d.id}')">Excluir</button>`)).join('')
    : empty('Nenhum documento nesta viagem.');
}

function openCheckModal(id=''){
  const t = requireTrip(); if(!t) return;
  const c = id ? t.checks.find(x=>x.id===id) : {};
  openModal(`
    <h3>${id?'Editar checklist':'Adicionar checklist'} — ${t.name}</h3>
    <input id="cText" placeholder="Item" value="${c.text||''}">
    <div class="modal-actions">
      ${id?`<button class="danger" onclick="removeItem('checks','${id}')">Excluir</button>`:''}
      <button class="ghost" onclick="closeModal()">Cancelar</button>
      <button class="primary" onclick="saveCheck('${id}')">Salvar</button>
    </div>
  `);
}

function saveCheck(id=''){
  const arr = trip().checks;
  const obj = {
    id: id || uid(),
    text: document.getElementById('cText').value.trim() || 'Novo item',
    done: id ? !!arr.find(x=>x.id===id)?.done : false
  };
  if(id){
    const found = arr.find(x=>x.id===id);
    found ? Object.assign(found,obj) : arr.push(obj);
  }else arr.push(obj);

  clearSearch();
  closeModal();
  showTab('checklist');
  renderAll();
}

function toggleCheck(id){
  const c = trip().checks.find(x=>x.id===id);
  if(c) c.done = !c.done;
  renderAll();
}

function renderChecks(){
  const t = trip(); if(!t) return;
  const arr = qfilter(t.checks, ['text']);
  document.getElementById('checksList').innerHTML = arr.length
    ? arr.map(c=>item('check', c.text, c.done?'Concluído':'Pendente',
      `<button class="ghost" onclick="toggleCheck('${c.id}')">${c.done?'Desmarcar':'Concluir'}</button>
       <button class="ghost" onclick="openCheckModal('${c.id}')">Editar</button>
       <button class="danger" onclick="removeItem('checks','${c.id}')">Excluir</button>`)).join('')
    : empty('Nenhum item nesta viagem.');
}

function addCurrency(){
  const t = requireTrip(); if(!t) return;
  const code = document.getElementById('newCurCode').value.trim().toUpperCase();
  const symbol = document.getElementById('newCurSymbol').value.trim() || code;
  const name = document.getElementById('newCurName').value.trim() || code;
  if(!code) return alert('Informe o código da moeda.');
  if(t.currencies.some(c=>c.code===code)) return alert('Essa moeda já existe nesta viagem.');
  t.currencies.push({code,symbol,name});
  document.getElementById('newCurCode').value='';
  document.getElementById('newCurSymbol').value='';
  document.getElementById('newCurName').value='';
  renderAll();
}

function removeCurrency(code){
  const t = requireTrip(); if(!t) return;
  if(code === 'BRL') return alert('BRL é a moeda base e não pode ser removida.');
  if(!confirm('Remover esta moeda desta viagem?')) return;
  t.currencies = t.currencies.filter(c=>c.code!==code);
  renderAll();
}

function renderCurrencies(){
  const t = trip(); if(!t) return;
  const arr = t.currencies || [];
  document.getElementById('currenciesList').innerHTML = arr.map(c=>item('globe', `${c.code} ${c.symbol}`, c.name,
    `<button class="danger" onclick="removeCurrency('${c.code}')">Excluir</button>`)).join('');
}

async function refreshRates(){
  const t = requireTrip(); if(!t) return;
  const values = {};
  const targets = (t.currencies||[]).map(c=>c.code).filter(c=>c && c !== 'BRL');

  if(!navigator.onLine){
    alert('Você está offline. Mostrei a última cotação salva, se existir.');
    renderRates();
    return;
  }

  if(!targets.length){
    t.rates = {updatedAt:new Date().toLocaleString('pt-BR'), values:{}};
    renderAll();
    return;
  }

  let ok = 0;
  await Promise.all(targets.map(async code=>{
    try{
      const res = await fetch(`https://economia.awesomeapi.com.br/json/last/${code}-BRL`);
      if(!res.ok) return;
      const js = await res.json();
      const val = Number(js?.[code+'BRL']?.bid || 0);
      if(val){ values[code] = val; ok++; }
    }catch(e){}
  }));

  if(ok){
    t.rates = {updatedAt:new Date().toLocaleString('pt-BR'), values:{...(t.rates?.values||{}), ...values}};
    renderAll();
  }else{
    alert('Não consegui atualizar a cotação agora. Mantive a última cotação salva.');
    renderRates();
  }
}

function renderRates(){
  const t = trip(); if(!t) return;
  const rates = t.rates || {};
  const values = rates.values || {};
  const el = document.getElementById('ratesList');
  if(!el) return;
  el.innerHTML = (t.currencies||[]).map(c=>{
    if(c.code === 'BRL'){
      return `<div class="rate-card"><small>${c.code}</small><strong>R$ 1,00</strong><span>Moeda base</span></div>`;
    }
    const v = values[c.code];
    return `<div class="rate-card"><small>${c.code}</small><strong>${v?brl(v):'—'}</strong><span>${v?'Atualizado: '+(rates.updatedAt||''):'Clique em atualizar cotação'}</span></div>`;
  }).join('') || '<div class="empty">Nenhuma moeda cadastrada.</div>';
}

function removeItem(collection,id){
  const t = requireTrip(); if(!t) return;
  if(!confirm('Excluir este item?')) return;
  t[collection] = t[collection].filter(x=>x.id!==id);
  closeModal();
  renderAll();
}

function exportBackup(){
  const blob = new Blob([JSON.stringify(db,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'guia-viagens-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importBackup(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      db = normalizeDB(JSON.parse(reader.result));
      activeTripId = db.activeTripId || db.trips[0].id;
      renderAll();
      alert('Backup importado.');
    }catch(e){
      alert('Arquivo de backup inválido.');
    }
  };
  reader.readAsText(file);
}

function clearAll(){
  if(!confirm('Apagar todos os dados deste navegador?')) return;
  localStorage.removeItem(STORE);
  db = loadDB();
  activeTripId = null;
  renderAll();
}

applyIcons();
renderAll();
