'use strict';
/* =========================================================
   Fit Evolution — app pessoal de recomposição corporal
   Dados salvos só no aparelho (localStorage + IndexedDB p/ fotos)
   ========================================================= */

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : NaN; };
const fmt = (n, d = 0) => (+n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const sgn = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n), d);
const DOW = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DOWS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const shortDate = s => { const d = parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const dateLabel = s => {
  const t = today();
  if (s === t) return 'Hoje';
  if (s === addDays(t, -1)) return 'Ontem';
  if (s === addDays(t, 1)) return 'Amanhã';
  return `${DOWS[parse(s).getDay()]}, ${shortDate(s)}`;
};
const weekStart = s => { const d = parse(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return iso(d); }; // segunda
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// ---------- dados padrão ----------
function defaultFoods() {
  const F = (nome, kcal, p, c, g, estado, base = 'g', un = '', ung = 0) => ({ id: uid(), nome, marca: '', kcal, p, c, g, estado, base, un, ung });
  // valores aproximados por 100 g/ml (referência TACO). Confira rótulos.
  return [
    F('Arroz branco', 128, 2.5, 28.1, 0.2, 'cozido', 'g', 'colher de servir', 45),
    F('Peito de frango grelhado', 159, 32, 0, 2.5, 'cozido', 'g', 'filé médio', 120),
    F('Peito de frango sem pele', 119, 21.5, 0, 3, 'cru'),
    F('Patinho grelhado', 219, 35.9, 0, 7.3, 'cozido', 'g', 'bife médio', 100),
    F('Patinho', 133, 21.7, 0, 4.5, 'cru'),
    F('Ovo inteiro cozido', 146, 13.3, 0.6, 9.5, 'cozido', 'g', 'unidade', 50),
    F('Pão francês', 300, 8, 58.6, 3.1, 'pronto', 'g', 'unidade', 50),
    F('Banana prata', 98, 1.3, 26, 0.1, 'cru', 'g', 'unidade', 70),
    F('Leite integral', 61, 3.2, 4.7, 3.3, 'pronto', 'ml', 'copo', 200),
    F('Leite desnatado', 35, 3.4, 4.9, 0.2, 'pronto', 'ml', 'copo', 200),
    F('Batata inglesa', 52, 1.2, 11.9, 0, 'cozido', 'g', 'unidade média', 130),
    F('Brócolis', 25, 2.1, 4.4, 0.5, 'cozido'),
    F('Cenoura', 30, 0.8, 6.7, 0.2, 'cozido'),
    F('Salada (alface e tomate)', 15, 1, 2.8, 0.2, 'cru', 'g', 'prato', 100),
    F('Azeite de oliva', 884, 0, 0, 100, 'pronto', 'g', 'colher de sopa', 8),
    F('Aveia em flocos', 394, 13.9, 66.6, 8.5, 'pronto', 'g', 'colher de sopa', 15),
    F('Maçã', 56, 0.3, 15.2, 0, 'cru', 'g', 'unidade', 130),
    F('Mamão formosa', 45, 0.8, 11.6, 0.1, 'cru', 'g', 'fatia', 150),
  ];
}
function defaultPlan() {
  const E = (nome, series, reps, descanso) => ({ id: uid(), nome, series, reps, descanso });
  return {
    1: { titulo: 'Peito, ombros e tríceps', foco: 'Força', ex: [E('Supino reto com barra', 4, '5–6', 150), E('Supino inclinado com halteres', 3, '6–8', 120), E('Desenvolvimento militar', 4, '5–6', 150), E('Elevação lateral', 3, '10–12', 60), E('Tríceps testa', 3, '8–10', 90), E('Tríceps na polia (corda)', 2, '10–12', 60)] },
    2: { titulo: 'Costas e bíceps', foco: 'Força', ex: [E('Barra fixa (ou puxada pesada)', 4, '5–8', 150), E('Remada curvada com barra', 4, '5–6', 150), E('Remada baixa', 3, '8–10', 90), E('Rosca direta com barra', 3, '6–8', 90), E('Rosca martelo', 2, '10–12', 60)] },
    3: { titulo: 'Pernas completas', foco: 'Ênfase em quadríceps', ex: [E('Agachamento livre', 4, '5–6', 180), E('Leg press 45°', 3, '8–10', 120), E('Agachamento búlgaro', 3, '8–10', 90), E('Cadeira extensora', 3, '12–15', 60), E('Mesa flexora', 2, '10–12', 60), E('Panturrilha em pé', 4, '10–12', 60)] },
    4: { titulo: 'Peito, ombros e tríceps', foco: 'Hipertrofia', ex: [E('Supino inclinado com barra', 3, '8–10', 120), E('Supino reto com halteres', 3, '10–12', 90), E('Crucifixo / peck deck', 3, '12–15', 60), E('Desenvolvimento com halteres', 3, '10–12', 90), E('Elevação lateral', 4, '12–15', 45), E('Tríceps francês', 3, '10–12', 60), E('Tríceps na polia (barra)', 2, '12–15', 45)] },
    5: { titulo: 'Costas e bíceps', foco: 'Hipertrofia', ex: [E('Puxada frente', 3, '10–12', 90), E('Remada unilateral com halter', 3, '10–12', 90), E('Remada cavalinho / máquina', 3, '10–12', 90), E('Pulldown braço reto', 2, '12–15', 60), E('Face pull', 3, '15', 45), E('Rosca inclinada com halteres', 3, '10–12', 60), E('Rosca Scott', 2, '12', 60)] },
    6: { titulo: 'Posterior de pernas e glúteos', foco: 'Posterior e glúteos', ex: [E('Stiff com barra', 4, '6–8', 150), E('Elevação pélvica (hip thrust)', 4, '8–10', 120), E('Mesa flexora', 3, '10–12', 60), E('Cadeira abdutora', 3, '15', 45), E('Panturrilha sentado', 3, '12–15', 45), E('Prancha abdominal', 3, '40 s', 45)] },
    0: { titulo: 'Descanso e recuperação', foco: 'Descanso', ex: [] },
  };
}
const MEALS = [
  { k: 'cafe', n: 'Café da manhã', s: 'pós-treino' },
  { k: 'almoco', n: 'Almoço' },
  { k: 'jantar', n: 'Jantar' },
  { k: 'extra', n: 'Extra / lanche' },
];
const POSES = ['Frente', 'Lado', 'Costas'];

// ---------- estado ----------
const KEY = 'fitevolution.v1';
function defaults() {
  return {
    v: 1,
    profile: { nome: '', idade: 29, altura: 176 },
    goals: { kcal: 2600, p: 180, c: 300, g: 75, pesoMeta: '', cinturaMeta: '' },
    prefs: { rest: true, sound: true, rem: { peso: true, cintura: true, fotos: true, revisao: true } },
    foods: defaultFoods(), diary: {}, plan: defaultPlan(), wlogs: {}, cardio: [],
    weights: [{ date: today(), kg: 91 }], waist: [],
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw); const base = defaults(); return { ...base, ...d, prefs: { ...base.prefs, ...d.prefs, rem: { ...base.prefs.rem, ...(d.prefs || {}).rem } } }; }
  } catch (e) { /* ignore */ }
  return defaults();
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Não foi possível salvar — armazenamento cheio?'); }
}
save();

// ---------- fotos (IndexedDB) ----------
const idb = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('fitevolution', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('photos', mode); const st = t.objectStore('photos');
      const out = fn(st); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error);
    });
  },
  all() { return this.tx('readonly', st => st.getAll()); },
  put(rec) { return this.tx('readwrite', st => st.put(rec)); },
  del(id) { return this.tx('readwrite', st => st.delete(id)); },
  clear() { return this.tx('readwrite', st => st.clear()); },
};
let PHOTOS = [];
async function loadPhotos() { try { PHOTOS = (await idb.all()) || []; PHOTOS.sort((a, b) => a.date < b.date ? 1 : -1); } catch (e) { PHOTOS = []; } }

// ---------- cálculos ----------
const dayObj = d => (S.diary[d] ||= { cafe: [], almoco: [], jantar: [], extra: [] });
const dayItems = d => { const x = S.diary[d]; return x ? MEALS.flatMap(m => x[m.k] || []) : []; };
const macros = it => { const f = it.q / 100; return { kcal: it.kcal * f, p: it.p * f, c: it.c * f, g: it.g * f }; };
const sum = items => items.reduce((a, it) => { const m = macros(it); a.kcal += m.kcal; a.p += m.p; a.c += m.c; a.g += m.g; return a; }, { kcal: 0, p: 0, c: 0, g: 0 });
const sortedW = () => [...S.weights].sort((a, b) => a.date < b.date ? -1 : 1);
const sortedWaist = () => [...S.waist].sort((a, b) => a.date < b.date ? -1 : 1);
function movingAvg(list) { // média dos registros dos últimos 7 dias
  return list.map(e => { const from = addDays(e.date, -6); const w = list.filter(x => x.date >= from && x.date <= e.date).map(x => x.kg); return { x: e.date, y: avg(w) }; });
}
function weeklyAvgs(list, key = 'kg') {
  const m = {};
  list.forEach(e => { const k = weekStart(e.date); (m[k] ||= []).push(e[key]); });
  return Object.keys(m).sort().map(k => ({ week: k, avg: avg(m[k]), n: m[k].length }));
}
function lastSession(exId, beforeDate) {
  const dates = Object.keys(S.wlogs).filter(d => d < beforeDate).sort().reverse();
  for (const d of dates) { const sets = S.wlogs[d][exId]; if (sets && sets.some(s => s.ok)) return { date: d, sets: sets.filter(s => s.ok) }; }
  return null;
}
const e1rm = (kg, reps) => kg * (1 + reps / 30);
const cardioWeek = (ref = today()) => { const ws = weekStart(ref), we = addDays(ws, 6); return S.cardio.filter(c => c.date >= ws && c.date <= we); };

// ---------- UI estado ----------
const UI = { tab: 'home', dDate: today(), tDate: today(), tSeg: 'musc', pSeg: 'peso', cmpA: null, cmpB: null, cmpPose: 'Frente' };

function render(scrollTop) {
  $$('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === UI.tab));
  const v = { home: vHome, diet: vDiet, train: vTrain, prog: vProg, more: vMore }[UI.tab];
  $('#view').innerHTML = v();
  const d = new Date();
  $('#topSub').textContent = `${DOW[d.getDay()]}, ${shortDate(today())}`;
  if (scrollTop) window.scrollTo(0, 0);
}

// ---------- componentes ----------
function ring(v, goal) {
  const r = 54, C = 2 * Math.PI * r, pct = Math.min(1, goal ? v / goal : 0);
  return `<svg viewBox="0 0 128 128" class="ring"><circle cx="64" cy="64" r="${r}" class="ring-bg"/><circle cx="64" cy="64" r="${r}" class="ring-fg ${v > goal * 1.03 ? 'over' : ''}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 64 64)"/></svg>`;
}
function macroBar(label, cls, v, goal) {
  return `<div><div class="mbar-top"><span><i class="dot ${cls}"></i>${label}</span><span class="num"><b>${fmt(v)}</b> / ${fmt(goal)} g</span></div><div class="track"><div class="fill ${cls}" style="width:${Math.min(100, goal ? v / goal * 100 : 0)}%"></div></div></div>`;
}
function kcalCard(t, title, sub = '') {
  const G = S.goals, left = G.kcal - t.kcal;
  return `<div class="card"><h3>${title}${sub}</h3><div class="kcal">
    <div class="ring-box">${ring(t.kcal, G.kcal)}<div class="ring-c"><b class="num">${fmt(t.kcal)}</b><span>de ${fmt(G.kcal)} kcal</span></div></div>
    <div class="mbars">
      <div class="small ${left < 0 ? 'warn' : 'muted'}">${left >= 0 ? `Faltam <b class="num" style="color:var(--tx)">${fmt(left)}</b> kcal` : `<b class="num">${fmt(-left)}</b> kcal acima da meta`}</div>
      ${macroBar('Proteína', 'p', t.p, G.p)}${macroBar('Carboidrato', 'c', t.c, G.c)}${macroBar('Gordura', 'g', t.g, G.g)}
    </div></div></div>`;
}
function dnav(date, act) {
  const d = parse(date);
  return `<div class="dnav"><button data-act="${act}" data-n="-1" aria-label="Dia anterior">‹</button>
    <div class="lbl">${dateLabel(date)}<small>${DOW[d.getDay()]} · ${shortDate(date)}/${d.getFullYear()}</small></div>
    <button data-act="${act}" data-n="1" aria-label="Próximo dia">›</button></div>`;
}
function seg(items, cur, act) {
  return `<div class="seg">${items.map(([k, l]) => `<button class="${k === cur ? 'on' : ''}" data-act="${act}" data-k="${k}">${l}</button>`).join('')}</div>`;
}
function lineChart(series, { h = 180, d = 1 } = {}) {
  const all = series.flatMap(s => s.pts).filter(p => isFinite(p.y));
  if (all.length < 2) return '<div class="empty">Registre pelo menos 2 valores para ver o gráfico.</div>';
  const xs = all.map(p => parse(p.x).getTime()), ys = all.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) x1 = x0 + 864e5;
  let y0 = Math.min(...ys), y1 = Math.max(...ys); const pd = (y1 - y0) * 0.18 || 1; y0 -= pd; y1 += pd;
  const W = 340, H = h, L = 36, R = 8, T = 8, B = 22;
  const sx = t => L + (t - x0) / (x1 - x0) * (W - L - R), sy = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  let g = '';
  for (let i = 0; i <= 3; i++) { const v = y0 + (y1 - y0) * i / 3, y = sy(v); g += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 5}" y="${y + 3}" text-anchor="end">${fmt(v, d)}</text>`; }
  const xl = [x0, (x0 + x1) / 2, x1].map((t, i) => { const dt = new Date(t); return `<text x="${sx(t)}" y="${H - 5}" text-anchor="${['start', 'middle', 'end'][i]}">${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}</text>`; }).join('');
  const paths = series.map(s => {
    const pts = s.pts.filter(p => isFinite(p.y)).map(p => [sx(parse(p.x).getTime()), sy(p.y)]);
    if (!pts.length) return '';
    const line = pts.length > 1 ? `<path d="M${pts.map(p => p.join(',')).join('L')}" fill="none" stroke="${s.color}" stroke-width="${s.w || 2}" stroke-linejoin="round" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="4 4"' : ''}/>` : '';
    const dots = s.dots ? pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${s.r || 2.6}" fill="${s.color}"/>`).join('') : '';
    return line + dots;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart">${g}${xl}${paths}</svg>`;
}

// ---------- INÍCIO ----------
function vHome() {
  const t = today(), tot = sum(dayItems(t)), dow = parse(t).getDay(), plan = S.plan[dow];
  const log = S.wlogs[t] || {};
  const totalSets = plan.ex.reduce((a, e) => a + (+e.series || 0), 0);
  const doneSets = plan.ex.reduce((a, e) => a + ((log[e.id] || []).filter(s => s.ok).length), 0);
  const cw = cardioWeek(), est = cw.filter(c => c.tipo === 'Esteira').length, esc_ = cw.filter(c => c.tipo === 'Escada').length;
  const ws = sortedW(), wk = weeklyAvgs(ws), cur = wk[wk.length - 1], prev = wk[wk.length - 2];
  const wa = sortedWaist(), lastWa = wa[wa.length - 1], firstWa = wa[0];
  const h = new Date().getHours(), greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = S.profile.nome ? `, ${esc(S.profile.nome)}` : '';

  // lembretes
  const R = [], rem = S.prefs.rem;
  if (rem.peso && !S.weights.some(w => w.date === t)) R.push(['kg', 'Registrar o peso de hoje', 'Em jejum, após o banheiro, mesma balança.', 'addWeight']);
  const lastWaD = lastWa ? diffDays(lastWa.date, t) : 99;
  if (rem.cintura && lastWaD >= 7) R.push(['cm', 'Medir a cintura', lastWa ? `Última medida há ${lastWaD} dias.` : 'Nenhuma medida ainda.', 'addWaist']);
  const lastPh = PHOTOS[0], phD = lastPh ? diffDays(lastPh.date, t) : 99;
  if (rem.fotos && phD >= 15) R.push(['📷', 'Tirar fotos de evolução', lastPh ? `Últimas fotos há ${phD} dias.` : 'Frente, lado e costas — mesma luz e posição.', 'goPhotos']);
  if (rem.revisao && dow === 0) R.push(['↻', 'Revisar a semana', 'Compare média de peso e cintura antes de ajustar calorias.', 'goProg']);

  return `
  <div class="hello"><h1>${greet}${nome}</h1><p>Foco: perder gordura preservando força e massa.</p></div>
  ${kcalCard(tot, 'Nutrição de hoje', `<button class="link" data-act="tab" data-k="diet">Abrir diário</button>`)}
  <div class="card">
    <h3>Treino de hoje <small>${DOW[dow]}</small></h3>
    <div class="row between"><div><div style="font-weight:700;font-size:16px">${esc(plan.titulo)}</div><span class="chip" style="margin-top:6px">${esc(plan.foco)}</span></div>
    ${plan.ex.length ? `<button class="btn pri" data-act="tab" data-k="train">${doneSets ? 'Continuar' : 'Começar'}</button>` : ''}</div>
    ${plan.ex.length ? `<div class="prog"><div style="width:${totalSets ? doneSets / totalSets * 100 : 0}%"></div></div><div class="small muted" style="margin-top:6px">${doneSets} de ${totalSets} séries · ${plan.ex.length} exercícios</div>` : `<p class="small muted" style="margin:8px 0 0">Dia de recuperar: sono, hidratação e passos leves.</p>`}
  </div>
  <div class="grid2" style="margin-bottom:12px">
    <div class="stat"><div class="eyebrow">Peso · média 7d</div><div class="v num">${cur ? fmt(cur.avg, 1) + ' kg' : '—'}</div>
      <div class="d ${prev && cur.avg - prev.avg <= 0 ? 'ac' : 'muted'}">${prev ? sgn(cur.avg - prev.avg) + ' kg vs semana ant.' : 'Registre diariamente'}</div></div>
    <div class="stat"><div class="eyebrow">Cintura</div><div class="v num">${lastWa ? fmt(lastWa.cm, 1) + ' cm' : '—'}</div>
      <div class="d ${firstWa && lastWa.cm - firstWa.cm <= 0 ? 'ac' : 'muted'}">${wa.length > 1 ? sgn(lastWa.cm - firstWa.cm) + ' cm desde o início' : 'Meça 1× por semana'}</div></div>
  </div>
  <div class="card">
    <h3>Cardio da semana <button class="link" data-act="addCardio">+ Registrar</button></h3>
    <div class="grid2">
      <div><div class="mbar-top"><span>Esteira</span><span class="num"><b>${est}</b> / 3–4</span></div><div class="track"><div class="fill" style="width:${Math.min(100, est / 4 * 100)}%"></div></div></div>
      <div><div class="mbar-top"><span>Escada</span><span class="num"><b>${esc_}</b> / 1–2</span></div><div class="track"><div class="fill p" style="width:${Math.min(100, esc_ / 2 * 100)}%"></div></div></div>
    </div>
  </div>
  ${R.length ? `<div class="card"><h3>Lembretes</h3>${R.map(r => `<button class="rem" style="width:100%;text-align:left" data-act="${r[3]}"><div class="ic">${r[0]}</div><div class="grow"><div style="font-weight:600">${r[1]}</div><div class="small muted">${r[2]}</div></div><span class="muted">›</span></button>`).join('')}</div>` : ''}
  <div class="grid2"><button class="btn block" data-act="addWeight">+ Peso</button><button class="btn block" data-act="addWaist">+ Cintura</button></div>
  <p class="foot">Metas e treino são pontos de partida. Não substitui nutricionista ou profissional de educação física.</p>`;
}

// ---------- DIETA ----------
function vDiet() {
  const d = UI.dDate, day = S.diary[d] || {}, tot = sum(dayItems(d));
  return `${dnav(d, 'dDate')}
  ${kcalCard(tot, 'Resumo do dia')}
  ${MEALS.map(m => {
    const items = day[m.k] || [], mt = sum(items);
    if (m.k === 'extra' && !items.length) return '';
    return `<div class="card"><div class="meal-h"><h3>${m.n}${m.s ? ` <small>${m.s}</small>` : ''}</h3><span class="small muted num">${fmt(mt.kcal)} kcal</span></div>
      ${items.length ? `<div>${items.map(it => { const x = macros(it); return `<button class="item" data-act="editItem" data-m="${m.k}" data-id="${it.id}">
        <div class="grow"><div class="nm">${esc(it.n)}</div><div class="mc num">${fmt(it.q)} ${it.base || 'g'} · P ${fmt(x.p)} · C ${fmt(x.c)} · G ${fmt(x.g)}</div></div><div class="kc num">${fmt(x.kcal)}</div></button>`; }).join('')}</div>` : `<div class="small muted" style="padding:4px 0">Nada registrado.</div>`}
      <button class="btn sm add-row" data-act="addFood" data-m="${m.k}">+ Adicionar alimento</button></div>`;
  }).join('')}
  <div class="grid2">
    <button class="btn block" data-act="addFood" data-m="extra">+ Extra / lanche</button>
    <button class="btn block" data-act="copyDay">Copiar dia anterior</button>
  </div>
  <button class="btn block ghost" style="margin-top:10px" data-act="foods">Biblioteca de alimentos</button>
  <p class="foot">Pese os alimentos e confira se o valor é cru ou cozido — isso muda bastante as calorias.</p>`;
}
function sheetAddFood(meal, q = '') {
  const qs = q.toLowerCase();
  const list = S.foods.filter(f => !qs || (f.nome + ' ' + f.marca).toLowerCase().includes(qs)).sort((a, b) => a.nome.localeCompare(b.nome));
  openSheet(`<h2>Adicionar em ${MEALS.find(m => m.k === meal).n}</h2>
    <input id="fq" placeholder="Buscar alimento…" value="${esc(q)}" autocomplete="off">
    <div id="flist" style="margin-top:8px">${foodList(list, meal)}</div>
    <button class="btn block" style="margin-top:12px" data-act="newFood" data-m="${meal}">+ Cadastrar novo alimento</button>`);
  const inp = $('#fq');
  inp.addEventListener('input', () => {
    const s = inp.value.toLowerCase();
    $('#flist').innerHTML = foodList(S.foods.filter(f => !s || (f.nome + ' ' + f.marca).toLowerCase().includes(s)).sort((a, b) => a.nome.localeCompare(b.nome)), meal);
  });
}
function foodList(list, meal) {
  if (!list.length) return '<div class="empty">Nenhum alimento encontrado.</div>';
  return list.map(f => `<button class="list-it" data-act="pickFood" data-id="${f.id}" data-m="${meal}"><div class="grow"><div style="font-weight:600">${esc(f.nome)}<span class="tag ${f.estado === 'cozido' ? 'ac' : ''}">${f.estado}</span></div>
    <div class="small muted">${f.marca ? esc(f.marca) + ' · ' : ''}${fmt(f.kcal)} kcal · P ${fmt(f.p, 1)} · C ${fmt(f.c, 1)} · G ${fmt(f.g, 1)} / 100 ${f.base}</div></div><span class="muted">›</span></button>`).join('');
}
function sheetQty({ food, meal, item }) {
  const base = food ? food.base : item.base || 'g';
  const per = food || item;
  const un = food && food.un && food.ung ? food : null;
  openSheet(`<h2>${esc(per.nome || per.n)}</h2>
    <div class="fld"><label>Quantidade</label>
      <div class="row"><input id="qv" inputmode="decimal" value="${item ? String(item.q).replace('.', ',') : (un ? '1' : '100')}" class="num">
      <select id="qu" style="width:auto">${`<option value="b">${base}</option>`}${un ? `<option value="u" ${!item ? 'selected' : ''}>${esc(un.un)} (${fmt(un.ung)} ${base})</option>` : ''}</select></div>
      ${food ? `<div class="hint">Valores por 100 ${base}${food.estado !== 'pronto' ? ` · peso <b>${food.estado}</b>` : ''}.</div>` : ''}
    </div>
    ${!item ? `<div class="fld"><label>Refeição</label><select id="qm">${MEALS.map(m => `<option value="${m.k}" ${m.k === meal ? 'selected' : ''}>${m.n}</option>`).join('')}</select></div>` : ''}
    <div class="totals" id="qprev"></div>
    <div class="row" style="margin-top:14px">${item ? `<button class="btn danger" data-act="delItem" data-m="${meal}" data-id="${item.id}">Remover</button>` : ''}
    <button class="btn pri grow" id="qok">${item ? 'Salvar' : 'Adicionar'}</button></div>`);
  const grams = () => { const v = num($('#qv').value); return isNaN(v) ? 0 : ($('#qu').value === 'u' ? v * un.ung : v); };
  const upd = () => { const m = macros({ ...per, q: grams() }); $('#qprev').innerHTML = `<div><b class="num">${fmt(m.kcal)}</b><span>kcal</span></div><div><b class="num">${fmt(m.p, 1)}</b><span>prot</span></div><div><b class="num">${fmt(m.c, 1)}</b><span>carb</span></div><div><b class="num">${fmt(m.g, 1)}</b><span>gord</span></div>`; };
  $('#qv').addEventListener('input', upd);
  $('#qu').addEventListener('change', () => { const v = num($('#qv').value) || 0; $('#qv').value = $('#qu').value === 'u' ? fmt(v / un.ung, 1).replace(',0', '') : Math.round(v * un.ung); upd(); });
  upd();
  $('#qok').onclick = () => {
    const g = grams(); if (!(g > 0)) return toast('Informe a quantidade');
    if (item) { item.q = Math.round(g * 10) / 10; }
    else {
      const mk = $('#qm').value;
      dayObj(UI.dDate)[mk].push({ id: uid(), fid: food.id, n: food.nome + (food.marca ? ` (${food.marca})` : ''), q: Math.round(g * 10) / 10, base: food.base, kcal: food.kcal, p: food.p, c: food.c, g: food.g });
    }
    save(); closeSheet(); render(); toast(item ? 'Atualizado' : 'Adicionado');
  };
}
function sheetFoods() {
  const list = [...S.foods].sort((a, b) => a.nome.localeCompare(b.nome));
  openSheet(`<h2>Biblioteca de alimentos</h2><p class="small muted" style="margin-top:-6px">Valores por 100 g/ml. Os padrões são aproximados (TACO) — ajuste pelo rótulo das marcas que você usa.</p>
    <button class="btn pri block" data-act="newFood">+ Novo alimento</button>
    <div style="margin-top:8px">${list.map(f => `<button class="list-it" data-act="editFood" data-id="${f.id}"><div class="grow"><div style="font-weight:600">${esc(f.nome)}<span class="tag ${f.estado === 'cozido' ? 'ac' : ''}">${f.estado}</span></div>
    <div class="small muted">${f.marca ? esc(f.marca) + ' · ' : ''}${fmt(f.kcal)} kcal · P ${fmt(f.p, 1)} · C ${fmt(f.c, 1)} · G ${fmt(f.g, 1)}${f.un ? ` · ${esc(f.un)} = ${fmt(f.ung)} ${f.base}` : ''}</div></div><span class="muted">›</span></button>`).join('')}</div>`);
}
function sheetFoodForm(id, meal) {
  const f = S.foods.find(x => x.id === id) || { nome: '', marca: '', kcal: '', p: '', c: '', g: '', estado: 'cozido', base: 'g', un: '', ung: '' };
  const F = (k, l, im = 'decimal') => `<div class="fld"><label>${l}</label><input id="f_${k}" inputmode="${im}" value="${esc(f[k] === 0 ? '0' : f[k])}"></div>`;
  openSheet(`<h2>${id ? 'Editar alimento' : 'Novo alimento'}</h2>
    <div class="fld"><label>Nome</label><input id="f_nome" value="${esc(f.nome)}" placeholder="Ex.: Arroz parboilizado"></div>
    <div class="grid2"><div class="fld"><label>Marca (opcional)</label><input id="f_marca" value="${esc(f.marca)}"></div>
    <div class="fld"><label>Estado do peso</label><select id="f_estado">${['cozido', 'cru', 'pronto'].map(e => `<option ${e === f.estado ? 'selected' : ''}>${e}</option>`).join('')}</select></div></div>
    <div class="fld"><label>Valores por 100</label><select id="f_base"><option value="g" ${f.base === 'g' ? 'selected' : ''}>gramas (g)</option><option value="ml" ${f.base === 'ml' ? 'selected' : ''}>mililitros (ml)</option></select></div>
    <div class="grid2">${F('kcal', 'Calorias (kcal)')}${F('p', 'Proteína (g)')}${F('c', 'Carboidrato (g)')}${F('g', 'Gordura (g)')}</div>
    <div class="grid2"><div class="fld"><label>Porção (opcional)</label><input id="f_un" value="${esc(f.un)}" placeholder="unidade, fatia…"></div>${F('ung', 'Peso da porção')}</div>
    <div class="row">${id ? `<button class="btn danger" data-act="delFood" data-id="${id}">Excluir</button>` : ''}<button class="btn pri grow" id="fok">Salvar</button></div>`);
  $('#fok').onclick = () => {
    const v = k => $('#f_' + k).value.trim();
    const o = { nome: v('nome'), marca: v('marca'), estado: v('estado'), base: v('base'), kcal: num(v('kcal')), p: num(v('p')) || 0, c: num(v('c')) || 0, g: num(v('g')) || 0, un: v('un'), ung: num(v('ung')) || 0 };
    if (!o.nome) return toast('Informe o nome');
    if (isNaN(o.kcal)) o.kcal = Math.round(o.p * 4 + o.c * 4 + o.g * 9);
    if (id) Object.assign(S.foods.find(x => x.id === id), o); else { o.id = uid(); S.foods.push(o); }
    save(); toast('Alimento salvo');
    if (meal) sheetQty({ food: id ? S.foods.find(x => x.id === id) : o, meal }); else sheetFoods();
  };
}

// ---------- TREINO ----------
function vTrain() {
  return seg([['musc', 'Musculação'], ['cardio', 'Cardio']], UI.tSeg, 'tSeg') + (UI.tSeg === 'musc' ? vMusc() : vCardio());
}
function vMusc() {
  const d = UI.tDate, dow = parse(d).getDay(), plan = S.plan[dow], log = S.wlogs[d] || {};
  const total = plan.ex.reduce((a, e) => a + (+e.series || 0), 0);
  const done = plan.ex.reduce((a, e) => a + ((log[e.id] || []).filter(s => s.ok).length), 0);
  return `${dnav(d, 'tDate')}
  <div class="card plan-h"><div class="row between"><div><div class="eyebrow">${DOW[dow]}</div><div class="t">${esc(plan.titulo)}</div></div>
    <button class="btn sm" data-act="editPlan" data-d="${dow}">Editar ficha</button></div>
    <div style="margin-top:8px"><span class="chip">${esc(plan.foco)}</span></div>
    ${plan.ex.length ? `<div class="prog"><div style="width:${total ? done / total * 100 : 0}%"></div></div><div class="small muted" style="margin-top:6px">${done} de ${total} séries concluídas</div>` : ''}
  </div>
  ${plan.ex.length ? plan.ex.map(e => exCard(e, d, log)).join('') + `<p class="foot">Compostos 3–4 séries, isoladores 2–3. Não precisa levar todas as séries à falha — deixe 1–3 repetições "no tanque" na maioria delas.</p>`
    : `<div class="card empty">Dia de descanso. Priorize sono, alimentação e passos leves.<br><br><button class="btn sm" data-act="addCardio">Registrar caminhada/cardio leve</button></div>`}`;
}
function exCard(e, d, log) {
  const sets = log[e.id] || [], n = +e.series || 0, last = lastSession(e.id, d);
  const allOk = n && sets.filter(s => s.ok).length >= n;
  let rows = '';
  for (let i = 0; i < n; i++) {
    const s = sets[i] || {}, ls = last && last.sets[i];
    rows += `<div class="set ${s.ok ? 'ok' : ''}"><div class="i">${i + 1}</div>
      <input inputmode="decimal" data-set="${e.id}|${i}|kg" value="${s.kg ?? ''}" placeholder="${ls ? fmt(ls.kg, 1).replace(',0', '') : 'kg'}">
      <input inputmode="numeric" data-set="${e.id}|${i}|reps" value="${s.reps ?? ''}" placeholder="${ls ? ls.reps : 'reps'}">
      <button class="chk ${s.ok ? 'on' : ''}" data-act="setOk" data-ex="${e.id}" data-i="${i}" aria-label="Concluir série">${ICON_CHECK}</button></div>`;
  }
  return `<div class="ex ${allOk ? 'done' : ''}">
    <button class="ex-h" data-act="exHist" data-id="${e.id}"><div><div class="n">${esc(e.nome)}</div><div class="rx">${n} × ${esc(e.reps)} · descanso ${fmtRest(e.descanso)}</div></div><span class="link">Histórico</span></button>
    ${last ? `<div class="last">Última (${shortDate(last.date)}): <b>${last.sets.map(s => `${fmt(s.kg, 1).replace(',0', '')}×${s.reps}`).join('  ')}</b></div>` : ''}
    <div class="set-lbl"><span>#</span><span>kg</span><span>reps</span><span></span></div>${rows}</div>`;
}
const fmtRest = s => s >= 60 ? `${Math.floor(s / 60)}:${pad(s % 60)} min` : `${s}s`;
function sheetExHist(id) {
  let ex; Object.values(S.plan).forEach(p => p.ex.forEach(e => { if (e.id === id) ex = e; }));
  const sess = Object.keys(S.wlogs).sort().filter(d => (S.wlogs[d][id] || []).some(s => s.ok)).map(d => {
    const ok = S.wlogs[d][id].filter(s => s.ok && s.kg > 0 && s.reps > 0);
    const best = ok.reduce((b, s) => Math.max(b, e1rm(s.kg, s.reps)), 0);
    const vol = ok.reduce((a, s) => a + s.kg * s.reps, 0);
    return { d, ok, best, vol };
  });
  openSheet(`<h2>${esc(ex ? ex.nome : 'Exercício')}</h2>
    <div class="eyebrow" style="margin-bottom:6px">1RM estimado (Epley) por sessão</div>
    ${lineChart([{ pts: sess.filter(s => s.best).map(s => ({ x: s.d, y: s.best })), color: 'var(--ac)', dots: true, r: 3.5 }], { h: 170, d: 0 })}
    <div class="sep"></div>
    ${sess.length ? `<table class="t"><tr><th>Data</th><th>Séries</th><th class="r">Volume</th></tr>${sess.slice().reverse().map(s => `<tr><td>${shortDate(s.d)}</td><td class="num">${s.ok.map(x => `${fmt(x.kg, 1).replace(',0', '')}×${x.reps}`).join(' ')}</td><td class="r num">${fmt(s.vol)} kg</td></tr>`).join('')}</table>` : '<div class="empty">Nenhuma sessão registrada ainda.</div>'}`);
}
function sheetPlan(dow) {
  const P = JSON.parse(JSON.stringify(S.plan[dow]));
  const draw = () => {
    openSheet(`<h2>Ficha de ${DOW[dow]}</h2>
    <div class="grid2"><div class="fld"><label>Título</label><input id="p_t" value="${esc(P.titulo)}"></div><div class="fld"><label>Foco</label><input id="p_f" value="${esc(P.foco)}"></div></div>
    <div id="p_ex">${P.ex.map((e, i) => `<div class="ed-ex" data-i="${i}"><div class="row"><input data-k="nome" value="${esc(e.nome)}" placeholder="Exercício">
      <button class="ico-btn" data-act="pMove" data-i="${i}" data-n="-1">↑</button><button class="ico-btn" data-act="pMove" data-i="${i}" data-n="1">↓</button><button class="ico-btn" data-act="pDel" data-i="${i}" style="color:var(--bad)">✕</button></div>
      <div class="grid3" style="margin-top:6px"><div><label class="small muted">Séries</label><input data-k="series" inputmode="numeric" value="${e.series}"></div><div><label class="small muted">Reps</label><input data-k="reps" value="${esc(e.reps)}"></div><div><label class="small muted">Descanso (s)</label><input data-k="descanso" inputmode="numeric" value="${e.descanso}"></div></div></div>`).join('') || '<div class="empty">Sem exercícios (dia de descanso).</div>'}</div>
    <button class="btn block" data-act="pAdd">+ Adicionar exercício</button>
    <button class="btn pri block" style="margin-top:10px" data-act="pSave">Salvar ficha</button>`);
  };
  const collect = () => {
    P.titulo = $('#p_t').value.trim() || P.titulo; P.foco = $('#p_f').value.trim();
    $$('#p_ex .ed-ex').forEach(el => { const e = P.ex[+el.dataset.i]; $$('[data-k]', el).forEach(inp => { const k = inp.dataset.k; e[k] = (k === 'series' || k === 'descanso') ? (parseInt(inp.value) || 0) : inp.value.trim(); }); });
  };
  SHEET_CTX = {
    pMove: ds => { collect(); const i = +ds.i, j = i + +ds.n; if (j < 0 || j >= P.ex.length) return; [P.ex[i], P.ex[j]] = [P.ex[j], P.ex[i]]; draw(); },
    pDel: ds => { collect(); P.ex.splice(+ds.i, 1); draw(); },
    pAdd: () => { collect(); P.ex.push({ id: uid(), nome: '', series: 3, reps: '10–12', descanso: 90 }); draw(); const ins = $$('#p_ex input[data-k="nome"]'); ins[ins.length - 1]?.focus(); },
    pSave: () => { collect(); P.ex = P.ex.filter(e => e.nome); S.plan[dow] = P; save(); closeSheet(); render(); toast('Ficha salva'); },
  };
  draw();
}

// ---------- CARDIO ----------
function vCardio() {
  const cw = cardioWeek(), est = cw.filter(c => c.tipo === 'Esteira'), esc_ = cw.filter(c => c.tipo === 'Escada');
  const min = cw.reduce((a, c) => a + (+c.min || 0), 0);
  const hist = [...S.cardio].sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 30);
  return `<div class="card"><h3>Esta semana <small>seg a dom</small></h3>
    <div class="grid3"><div class="stat"><div class="eyebrow">Esteira</div><div class="v num">${est.length}<span class="small muted"> /3–4</span></div></div>
    <div class="stat"><div class="eyebrow">Escada</div><div class="v num">${esc_.length}<span class="small muted"> /1–2</span></div></div>
    <div class="stat"><div class="eyebrow">Minutos</div><div class="v num">${fmt(min)}</div></div></div>
    <div class="small muted" style="margin-top:10px">Esteira 25–35 min em ritmo confortável · Escada 8–15 min moderada · evite cardio intenso após treino pesado de pernas.</div></div>
  <button class="btn pri block" data-act="addCardio" style="margin-bottom:12px">+ Registrar cardio</button>
  <div class="card"><h3>Histórico</h3>${hist.length ? hist.map(c => `<button class="list-it" data-act="editCardio" data-id="${c.id}"><div class="grow"><div style="font-weight:600">${c.tipo} · ${fmt(c.min)} min<span class="tag">${esc(c.int)}</span></div>
    <div class="small muted">${dateLabel(c.date)}${c.incl ? ` · incl. ${fmt(c.incl, 1)}%` : ''}${c.vel ? ` · ${fmt(c.vel, 1)} km/h` : ''}${c.nota ? ` · ${esc(c.nota)}` : ''}</div></div><span class="muted">›</span></button>`).join('') : '<div class="empty">Nenhum cardio registrado.</div>'}</div>`;
}
function sheetCardio(id) {
  const c = S.cardio.find(x => x.id === id) || { date: today(), tipo: 'Esteira', min: 30, int: 'Moderada', incl: '', vel: '', nota: '' };
  openSheet(`<h2>${id ? 'Editar cardio' : 'Registrar cardio'}</h2>
    <div class="grid2"><div class="fld"><label>Data</label><input type="date" id="c_d" value="${c.date}"></div>
    <div class="fld"><label>Tipo</label><select id="c_t">${['Esteira', 'Escada', 'Caminhada', 'Bicicleta', 'Outro'].map(t => `<option ${t === c.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
    <div class="grid2"><div class="fld"><label>Duração (min)</label><input id="c_m" inputmode="numeric" value="${c.min}"></div>
    <div class="fld"><label>Intensidade</label><select id="c_i">${['Leve', 'Moderada', 'Alta'].map(t => `<option ${t === c.int ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
    <div class="grid2"><div class="fld"><label>Inclinação (%)</label><input id="c_in" inputmode="decimal" value="${c.incl ?? ''}"></div><div class="fld"><label>Velocidade (km/h)</label><input id="c_v" inputmode="decimal" value="${c.vel ?? ''}"></div></div>
    <div class="fld"><label>Observação</label><input id="c_n" value="${esc(c.nota)}"></div>
    <div id="c_warn"></div>
    <div class="row">${id ? `<button class="btn danger" data-act="delCardio" data-id="${id}">Excluir</button>` : ''}<button class="btn pri grow" id="c_ok">Salvar</button></div>`);
  const warn = () => {
    const d = $('#c_d').value, legs = d && [3, 6].includes(parse(d).getDay()) && (S.wlogs[d] || S.plan[parse(d).getDay()].ex.length);
    $('#c_warn').innerHTML = legs && $('#c_i').value === 'Alta' ? '<div class="insight w" style="margin-bottom:12px">Hoje é dia de pernas. Prefira cardio leve/moderado para não atrapalhar a recuperação.</div>' : '';
  };
  ['#c_d', '#c_i'].forEach(s => $(s).addEventListener('change', warn)); warn();
  $('#c_ok').onclick = () => {
    const o = { date: $('#c_d').value || today(), tipo: $('#c_t').value, min: parseInt($('#c_m').value) || 0, int: $('#c_i').value, incl: num($('#c_in').value) || '', vel: num($('#c_v').value) || '', nota: $('#c_n').value.trim() };
    if (!o.min) return toast('Informe a duração');
    if (id) Object.assign(S.cardio.find(x => x.id === id), o); else S.cardio.push({ id: uid(), ...o });
    save(); closeSheet(); render(); toast('Cardio salvo');
  };
}

// ---------- EVOLUÇÃO ----------
function vProg() {
  return seg([['peso', 'Peso'], ['cintura', 'Cintura'], ['fotos', 'Fotos']], UI.pSeg, 'pSeg') + ({ peso: vPeso, cintura: vCintura, fotos: vFotos }[UI.pSeg])();
}
function trendInsight() {
  const wk = weeklyAvgs(sortedW()).filter(w => w.week <= weekStart(today()));
  const last = wk.slice(-3);
  if (last.length < 3) return `<div class="insight">Registre o peso pela manhã por <b>2–3 semanas</b>. A análise usa médias semanais, não o número de um dia.</div>`;
  const rate = (last[2].avg - last[0].avg) / 2, pct = rate / last[2].avg * 100;
  const wa = weeklyAvgs(sortedWaist().map(x => ({ date: x.date, kg: x.cm })));
  const waTxt = wa.length >= 2 ? ` Cintura: ${sgn(wa[wa.length - 1].avg - wa[Math.max(0, wa.length - 3)].avg)} cm no período.` : '';
  if (rate > -0.1) return `<div class="insight w"><b>Peso estável nas últimas semanas</b> (${sgn(rate, 2)} kg/sem).${waTxt} Se a cintura também não caiu, uma opção é reduzir ~100–200 kcal (de carbo ou gordura, mantendo a proteína) e reavaliar em 2–3 semanas.</div>`;
  if (pct < -1) return `<div class="insight w"><b>Queda rápida</b> (${sgn(rate, 2)} kg/sem · ${fmt(pct, 1)}%).${waTxt} Se força ou recuperação caírem, considere subir ~100–200 kcal para preservar massa muscular.</div>`;
  return `<div class="insight"><b>Ritmo consistente</b>: ${sgn(rate, 2)} kg/semana (${fmt(pct, 1)}% do peso).${waTxt} Mantenha o plano e continue acompanhando.</div>`;
}
function vPeso() {
  const ws = sortedW(), ma = movingAvg(ws), wk = weeklyAvgs(ws).slice(-8).reverse();
  const first = ws[0], last = ws[ws.length - 1], meta = num(S.goals.pesoMeta);
  return `<div class="card"><h3>Peso <button class="btn sm pri" data-act="addWeight">+ Registrar</button></h3>
    ${lineChart([{ pts: ws.map(e => ({ x: e.date, y: e.kg })), color: '#5f6a62', dots: true, w: 0 }, { pts: ma, color: 'var(--ac)', w: 2.5 }])}
    <div class="legend"><span><i style="background:#5f6a62"></i>Diário</span><span><i style="background:var(--ac)"></i>Média 7 dias</span></div>
    ${first ? `<div class="grid3" style="margin-top:12px"><div class="stat"><div class="eyebrow">Início</div><div class="v num" style="font-size:17px">${fmt(first.kg, 1)}</div></div>
      <div class="stat"><div class="eyebrow">Atual</div><div class="v num" style="font-size:17px">${fmt(last.kg, 1)}</div></div>
      <div class="stat"><div class="eyebrow">${isNaN(meta) ? 'Variação' : 'Falta p/ meta'}</div><div class="v num ${last.kg - first.kg <= 0 ? 'ac' : ''}" style="font-size:17px">${isNaN(meta) ? sgn(last.kg - first.kg) : fmt(Math.max(0, last.kg - meta), 1)}</div></div></div>` : ''}
  </div>
  ${trendInsight()}
  <div class="card" style="margin-top:12px"><h3>Médias semanais</h3>${wk.length ? `<table class="t"><tr><th>Semana</th><th class="r">Média</th><th class="r">Δ</th><th class="r">Reg.</th></tr>
    ${wk.map((w, i) => { const p = wk[i + 1]; const dl = p ? w.avg - p.avg : NaN; return `<tr><td>${shortDate(w.week)}</td><td class="r num">${fmt(w.avg, 1)} kg</td><td class="r num ${dl <= 0 ? 'ac' : 'warn'}">${p ? sgn(dl, 2) : '—'}</td><td class="r muted">${w.n}</td></tr>`; }).join('')}</table>` : '<div class="empty">Sem registros.</div>'}</div>
  <div class="card"><h3>Registros</h3>${ws.length ? ws.slice().reverse().slice(0, 40).map(e => `<button class="list-it" data-act="editWeight" data-d="${e.date}"><div class="grow">${dateLabel(e.date)}</div><b class="num">${fmt(e.kg, 1)} kg</b></button>`).join('') : '<div class="empty">Sem registros.</div>'}</div>`;
}
function vCintura() {
  const wa = sortedWaist(), first = wa[0], last = wa[wa.length - 1], meta = num(S.goals.cinturaMeta);
  return `<div class="card"><h3>Cintura <button class="btn sm pri" data-act="addWaist">+ Registrar</button></h3>
    ${lineChart([{ pts: wa.map(e => ({ x: e.date, y: e.cm })), color: 'var(--p)', dots: true, r: 3.5, w: 2.5 }])}
    <p class="small muted" style="margin:10px 0 0">Meça 1× por semana, na altura do umbigo, relaxado e no mesmo horário.</p>
    ${first ? `<div class="grid3" style="margin-top:12px"><div class="stat"><div class="eyebrow">Início</div><div class="v num" style="font-size:17px">${fmt(first.cm, 1)}</div></div>
      <div class="stat"><div class="eyebrow">Atual</div><div class="v num" style="font-size:17px">${fmt(last.cm, 1)}</div></div>
      <div class="stat"><div class="eyebrow">${isNaN(meta) ? 'Variação' : 'Falta p/ meta'}</div><div class="v num ${last.cm - first.cm <= 0 ? 'ac' : ''}" style="font-size:17px">${isNaN(meta) ? sgn(last.cm - first.cm) : fmt(Math.max(0, last.cm - meta), 1)}</div></div></div>` : ''}
  </div>
  <div class="card"><h3>Registros</h3>${wa.length ? wa.slice().reverse().map(e => `<button class="list-it" data-act="editWaist" data-d="${e.date}"><div class="grow">${dateLabel(e.date)}</div><b class="num">${fmt(e.cm, 1)} cm</b></button>`).join('') : '<div class="empty">Sem medidas ainda.</div>'}</div>`;
}
function vFotos() {
  const dates = [...new Set(PHOTOS.map(p => p.date))].sort().reverse();
  const last = PHOTOS[0], next = last ? 15 - diffDays(last.date, today()) : 0;
  const pd = dates.filter(d => PHOTOS.some(p => p.date === d && p.pose === UI.cmpPose));
  const A = UI.cmpA && pd.includes(UI.cmpA) ? UI.cmpA : pd[pd.length - 1], B = UI.cmpB && pd.includes(UI.cmpB) ? UI.cmpB : pd[0];
  const img = d => { const p = PHOTOS.find(x => x.date === d && x.pose === UI.cmpPose); return p ? `<div class="ph"><img src="${p.data}" alt=""><span>${shortDate(d)}</span></div>` : '<div class="ph"></div>'; };
  return `<div class="card"><h3>Fotos de evolução <small>${last ? (next > 0 ? `próximas em ${next} dias` : 'hora de novas fotos') : 'a cada 15 dias'}</small></h3>
    <div class="grid3">${POSES.map(p => `<button class="btn sm" data-act="addPhoto" data-k="${p}">+ ${p}</button>`).join('')}</div>
    <p class="small muted" style="margin:10px 0 0">Mesma luz, distância, roupa e horário. As fotos ficam só neste aparelho.</p></div>
  ${pd.length >= 2 ? `<div class="card"><h3>Comparar</h3>
    <div class="grid3" style="margin-bottom:10px"><select data-cmp="pose">${POSES.map(p => `<option ${p === UI.cmpPose ? 'selected' : ''}>${p}</option>`).join('')}</select>
    <select data-cmp="a">${pd.map(d => `<option value="${d}" ${d === A ? 'selected' : ''}>${shortDate(d)}</option>`).join('')}</select>
    <select data-cmp="b">${pd.map(d => `<option value="${d}" ${d === B ? 'selected' : ''}>${shortDate(d)}</option>`).join('')}</select></div>
    <div class="cmp">${img(A)}${img(B)}</div><div class="small muted" style="margin-top:6px;text-align:center">${A && B ? `${Math.abs(diffDays(A, B))} dias de diferença` : ''}</div></div>`
    : `<div class="card"><div class="empty">${PHOTOS.length ? `Adicione fotos em outra data (pose “${UI.cmpPose}”) para comparar.` : 'Nenhuma foto ainda.'}</div>${PHOTOS.length ? `<select data-cmp="pose">${POSES.map(p => `<option ${p === UI.cmpPose ? 'selected' : ''}>${p}</option>`).join('')}</select>` : ''}</div>`}
  ${dates.map(d => `<div class="card"><h3>${dateLabel(d)} <small>${shortDate(d)}</small></h3><div class="ph-grid">${PHOTOS.filter(p => p.date === d).map(p => `<button class="ph" data-act="viewPhoto" data-id="${p.id}"><img src="${p.data}" alt="${p.pose}" loading="lazy"><span>${p.pose}</span></button>`).join('')}</div></div>`).join('')}`;
}
function sheetMeasure(kind, date) {
  const isW = kind === 'w', list = isW ? S.weights : S.waist, key = isW ? 'kg' : 'cm';
  const ex = date ? list.find(x => x.date === date) : list.find(x => x.date === today());
  const lastV = (isW ? sortedW() : sortedWaist()).slice(-1)[0];
  openSheet(`<h2>${isW ? 'Peso' : 'Cintura'}</h2>
    <div class="grid2"><div class="fld"><label>Data</label><input type="date" id="m_d" value="${ex ? ex.date : today()}" max="${today()}"></div>
    <div class="fld"><label>${isW ? 'Peso (kg)' : 'Cintura (cm)'}</label><input id="m_v" inputmode="decimal" value="${ex ? String(ex[key]).replace('.', ',') : ''}" placeholder="${lastV ? fmt(lastV[key], 1) : ''}"></div></div>
    <p class="hint" style="margin-top:-4px">${isW ? 'Pese-se em condições parecidas: ao acordar, após o banheiro, antes de comer.' : 'Fita na altura do umbigo, sem apertar, após expirar normalmente.'}</p>
    <div class="row" style="margin-top:12px">${ex ? `<button class="btn danger" data-act="delMeasure" data-k="${kind}" data-d="${ex.date}">Excluir</button>` : ''}<button class="btn pri grow" id="m_ok">Salvar</button></div>`);
  setTimeout(() => $('#m_v')?.focus(), 250);
  $('#m_ok').onclick = () => {
    const d = $('#m_d').value || today(), v = num($('#m_v').value);
    if (!(v > 0)) return toast('Informe um valor');
    const i = list.findIndex(x => x.date === (ex && date ? ex.date : d)); if (i >= 0) list.splice(i, 1);
    const j = list.findIndex(x => x.date === d); if (j >= 0) list.splice(j, 1);
    list.push({ date: d, [key]: v }); save(); closeSheet(); render(); toast('Salvo');
  };
}
async function handlePhoto(file, pose) {
  if (!file) return;
  try {
    const data = await compress(file, 1000, 0.78);
    const rec = { id: uid(), date: today(), pose, data };
    await idb.put(rec); await loadPhotos(); render(); toast(`Foto (${pose}) salva`);
  } catch (e) { toast('Não foi possível salvar a foto'); }
}
function compress(file, max, q) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = rej; img.src = url;
  });
}

// ---------- AJUSTES ----------
function vMore() {
  const G = S.goals, P = S.profile, calc = Math.round(G.p * 4 + G.c * 4 + G.g * 9), rem = S.prefs.rem;
  const sw = (k, on, l, sub) => `<div class="set-row"><div><div style="font-weight:600">${l}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div><label class="switch"><input type="checkbox" data-pref="${k}" ${on ? 'checked' : ''}><span></span></label></div>`;
  return `<div class="card"><h3>Metas diárias</h3>
    <div class="grid2"><div class="fld"><label>Calorias (kcal)</label><input id="g_kcal" inputmode="numeric" value="${G.kcal}"></div><div class="fld"><label><i class="dot p"></i>Proteína (g)</label><input id="g_p" inputmode="numeric" value="${G.p}"></div>
    <div class="fld"><label><i class="dot c"></i>Carboidrato (g)</label><input id="g_c" inputmode="numeric" value="${G.c}"></div><div class="fld"><label><i class="dot g"></i>Gordura (g)</label><input id="g_g" inputmode="numeric" value="${G.g}"></div></div>
    <div class="hint" id="g_hint" style="margin:-4px 0 12px">Macros somam ${fmt(calc)} kcal${Math.abs(calc - G.kcal) > 50 ? ` <span class="warn">(diferente da meta)</span>` : ''}.</div>
    <div class="grid2"><div class="fld"><label>Peso meta (kg)</label><input id="g_pm" inputmode="decimal" value="${esc(G.pesoMeta)}" placeholder="opcional"></div><div class="fld"><label>Cintura meta (cm)</label><input id="g_cm" inputmode="decimal" value="${esc(G.cinturaMeta)}" placeholder="opcional"></div></div>
    <button class="btn pri block" data-act="saveGoals">Salvar metas</button>
    <p class="small muted" style="margin:10px 0 0">Ponto de partida: 2.600 kcal · 180 P · 300 C · 75 G. Ajuste só após 2–3 semanas de tendência.</p></div>
  <div class="card"><h3>Perfil</h3><div class="grid3"><div class="fld"><label>Nome</label><input id="pf_n" value="${esc(P.nome)}"></div><div class="fld"><label>Idade</label><input id="pf_i" inputmode="numeric" value="${esc(P.idade)}"></div><div class="fld"><label>Altura (cm)</label><input id="pf_a" inputmode="numeric" value="${esc(P.altura)}"></div></div>
    <button class="btn block" data-act="saveProfile">Salvar perfil</button></div>
  <div class="card"><h3>Lembretes no início</h3>
    ${sw('rem.peso', rem.peso, 'Peso diário')}${sw('rem.cintura', rem.cintura, 'Cintura semanal')}${sw('rem.fotos', rem.fotos, 'Fotos a cada 15 dias')}${sw('rem.revisao', rem.revisao, 'Revisão aos domingos')}</div>
  <div class="card"><h3>Treino</h3>${sw('rest', S.prefs.rest, 'Timer de descanso automático', 'Inicia ao concluir uma série')}${sw('sound', S.prefs.sound, 'Som e vibração no fim do descanso')}</div>
  <div class="card"><h3>Dados</h3>
    <button class="list-it" data-act="foods"><div class="grow" style="font-weight:600">Biblioteca de alimentos</div><span class="muted">${S.foods.length} ›</span></button>
    ${window.__installPrompt ? `<button class="list-it" data-act="install"><div class="grow" style="font-weight:600">Instalar app no aparelho</div><span class="muted">›</span></button>` : ''}
    <button class="list-it" data-act="export"><div class="grow"><div style="font-weight:600">Exportar backup</div><div class="small muted">Arquivo .json com tudo, incluindo fotos</div></div><span class="muted">›</span></button>
    <button class="list-it" data-act="import"><div class="grow"><div style="font-weight:600">Importar backup</div><div class="small muted">Substitui os dados atuais</div></div><span class="muted">›</span></button>
    <button class="list-it" data-act="wipe"><div class="grow" style="font-weight:600;color:var(--bad)">Apagar todos os dados</div></button></div>
  <p class="foot">Fit Evolution · dados salvos apenas neste aparelho, sem conta e sem servidor.<br>Não substitui avaliação de nutricionista ou profissional de educação física.</p>`;
}
async function doExport() {
  await loadPhotos();
  const blob = new Blob([JSON.stringify({ app: 'fitevolution', at: new Date().toISOString(), state: S, photos: PHOTOS })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fit-evolution-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Backup exportado');
}
async function doImport(file) {
  try {
    const d = JSON.parse(await file.text());
    if (d.app !== 'fitevolution' || !d.state) throw 0;
    S = { ...defaults(), ...d.state }; save();
    await idb.clear(); for (const p of d.photos || []) await idb.put(p);
    await loadPhotos(); render(true); toast('Backup restaurado');
  } catch (e) { toast('Arquivo de backup inválido'); }
}

// ---------- sheet / toast ----------
let SHEET_CTX = {};
function openSheet(html) {
  $('#sheet').innerHTML = `<div class="grab"></div><button class="sheet-x" data-act="closeSheet" aria-label="Fechar">✕</button>${html}`;
  $('#sheetWrap').hidden = false; document.body.style.overflow = 'hidden';
}
function closeSheet() { $('#sheetWrap').hidden = true; document.body.style.overflow = ''; SHEET_CTX = {}; }
function confirmSheet(title, text, label, fn) {
  openSheet(`<h2>${title}</h2><p class="muted">${text}</p><div class="row" style="margin-top:14px"><button class="btn grow" data-act="closeSheet">Cancelar</button><button class="btn danger grow" id="cf_ok">${label}</button></div>`);
  $('#cf_ok').onclick = () => { closeSheet(); fn(); };
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2000); }

// ---------- timer de descanso ----------
const timer = { end: 0, total: 0, int: null };
function startRest(sec) {
  if (!S.prefs.rest || !sec) return;
  timer.total = sec; timer.end = Date.now() + sec * 1000; clearInterval(timer.int); timer.int = setInterval(tick, 250); tick();
}
function tick() {
  const el = $('#rest'), left = Math.ceil((timer.end - Date.now()) / 1000);
  if (left <= 0) { stopRest(); if (S.prefs.sound) { beep(); navigator.vibrate?.([200, 100, 200]); } toast('Descanso finalizado — próxima série!'); return; }
  el.hidden = false; $('.rest-t', el).textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
  $('.rest-fill', el).style.width = Math.min(100, left / timer.total * 100) + '%';
}
function stopRest() { clearInterval(timer.int); $('#rest').hidden = true; }
let actx;
function beep() {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach(t => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(0.25, actx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + t + 0.2); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.22); });
  } catch (e) { /* sem áudio */ }
}

// ---------- ações ----------
let photoPose = 'Frente';
const A = {
  tab: ds => { UI.tab = ds.k; render(true); },
  dDate: ds => { UI.dDate = addDays(UI.dDate, +ds.n); render(); },
  tDate: ds => { UI.tDate = addDays(UI.tDate, +ds.n); render(); },
  tSeg: ds => { UI.tSeg = ds.k; render(); },
  pSeg: ds => { UI.pSeg = ds.k; render(); },
  goPhotos: () => { UI.tab = 'prog'; UI.pSeg = 'fotos'; render(true); },
  goProg: () => { UI.tab = 'prog'; UI.pSeg = 'peso'; render(true); },
  closeSheet: () => closeSheet(),
  addFood: ds => sheetAddFood(ds.m),
  pickFood: ds => sheetQty({ food: S.foods.find(f => f.id === ds.id), meal: ds.m }),
  newFood: ds => sheetFoodForm(null, ds.m),
  editFood: ds => sheetFoodForm(ds.id),
  delFood: ds => confirmSheet('Excluir alimento?', 'Registros antigos do diário não são afetados.', 'Excluir', () => { S.foods = S.foods.filter(f => f.id !== ds.id); save(); sheetFoods(); }),
  foods: () => sheetFoods(),
  editItem: ds => { const it = (S.diary[UI.dDate][ds.m] || []).find(i => i.id === ds.id); if (it) sheetQty({ item: it, meal: ds.m }); },
  delItem: ds => { const arr = S.diary[UI.dDate][ds.m]; arr.splice(arr.findIndex(i => i.id === ds.id), 1); save(); closeSheet(); render(); toast('Removido'); },
  copyDay: () => {
    const prev = S.diary[addDays(UI.dDate, -1)];
    if (!prev || !MEALS.some(m => (prev[m.k] || []).length)) return toast('Dia anterior está vazio');
    const go = () => { S.diary[UI.dDate] = Object.fromEntries(MEALS.map(m => [m.k, (prev[m.k] || []).map(i => ({ ...i, id: uid() }))])); save(); render(); toast('Refeições copiadas'); };
    dayItems(UI.dDate).length ? confirmSheet('Substituir o dia?', 'Os alimentos já registrados hoje serão trocados pelos do dia anterior.', 'Substituir', go) : go();
  },
  setOk: ds => {
    const d = UI.tDate, log = (S.wlogs[d] ||= {}), sets = (log[ds.ex] ||= []), i = +ds.i, s = (sets[i] ||= {});
    if (!s.ok) {
      const last = lastSession(ds.ex, d), ls = last && last.sets[i];
      const row = $(`[data-set="${ds.ex}|${i}|kg"]`).closest('.set');
      const kg = num($('[data-set$="|kg"]', row).value), reps = parseInt($('[data-set$="|reps"]', row).value);
      s.kg = !isNaN(kg) ? kg : (ls ? ls.kg : NaN); s.reps = !isNaN(reps) ? reps : (ls ? ls.reps : NaN);
      if (isNaN(s.kg) || isNaN(s.reps)) { delete s.kg; delete s.reps; return toast('Preencha kg e repetições'); }
      s.ok = true;
      let ex; Object.values(S.plan).forEach(p => p.ex.forEach(e => { if (e.id === ds.ex) ex = e; }));
      startRest(ex ? +ex.descanso : 90);
    } else s.ok = false;
    save(); const y = window.scrollY; render(); window.scrollTo(0, y);
  },
  exHist: ds => sheetExHist(ds.id),
  editPlan: ds => sheetPlan(+ds.d),
  addCardio: () => sheetCardio(),
  editCardio: ds => sheetCardio(ds.id),
  delCardio: ds => { S.cardio = S.cardio.filter(c => c.id !== ds.id); save(); closeSheet(); render(); toast('Excluído'); },
  addWeight: () => sheetMeasure('w'),
  addWaist: () => sheetMeasure('c'),
  editWeight: ds => sheetMeasure('w', ds.d),
  editWaist: ds => sheetMeasure('c', ds.d),
  delMeasure: ds => { const k = ds.k === 'w' ? 'weights' : 'waist'; S[k] = S[k].filter(x => x.date !== ds.d); save(); closeSheet(); render(); toast('Excluído'); },
  addPhoto: ds => { photoPose = ds.k; $('#filePhoto').value = ''; $('#filePhoto').click(); },
  viewPhoto: ds => {
    const p = PHOTOS.find(x => x.id === ds.id); if (!p) return;
    openSheet(`<h2>${p.pose} · ${shortDate(p.date)}</h2><img src="${p.data}" style="width:100%;border-radius:12px;display:block" alt="">
      <div class="grid2" style="margin-top:12px"><div class="fld"><label>Data</label><input type="date" id="ph_d" value="${p.date}" max="${today()}"></div><div class="fld"><label>Pose</label><select id="ph_p">${POSES.map(x => `<option ${x === p.pose ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
      <div class="row"><button class="btn danger" id="ph_del">Excluir</button><button class="btn pri grow" id="ph_ok">Salvar</button></div>`);
    $('#ph_ok').onclick = async () => { p.date = $('#ph_d').value || p.date; p.pose = $('#ph_p').value; await idb.put(p); await loadPhotos(); closeSheet(); render(); };
    $('#ph_del').onclick = () => confirmSheet('Excluir foto?', 'Essa ação não pode ser desfeita.', 'Excluir', async () => { await idb.del(p.id); await loadPhotos(); render(); });
  },
  restAdd: () => { timer.end += 15000; timer.total += 15; tick(); },
  restStop: () => stopRest(),
  saveGoals: () => {
    const v = id => num($(id).value);
    const g = { kcal: v('#g_kcal'), p: v('#g_p'), c: v('#g_c'), g: v('#g_g') };
    if (Object.values(g).some(x => !(x >= 0))) return toast('Revise os valores');
    Object.assign(S.goals, g, { pesoMeta: $('#g_pm').value.trim(), cinturaMeta: $('#g_cm').value.trim() }); save(); render(); toast('Metas salvas');
  },
  saveProfile: () => { Object.assign(S.profile, { nome: $('#pf_n').value.trim(), idade: $('#pf_i').value.trim(), altura: $('#pf_a').value.trim() }); save(); toast('Perfil salvo'); },
  install: async () => { const p = window.__installPrompt; if (!p) return; p.prompt(); await p.userChoice; window.__installPrompt = null; render(); },
  export: () => doExport(),
  import: () => { $('#fileImport').value = ''; $('#fileImport').click(); },
  wipe: () => confirmSheet('Apagar tudo?', 'Diário, treinos, medidas e fotos serão removidos deste aparelho. Exporte um backup antes, se quiser.', 'Apagar tudo', async () => { localStorage.removeItem(KEY); await idb.clear(); S = defaults(); save(); PHOTOS = []; render(true); toast('Dados apagados'); }),
};

document.addEventListener('click', e => {
  const tb = e.target.closest('.tabbar button'); if (tb) { UI.tab = tb.dataset.tab; render(true); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = SHEET_CTX[el.dataset.act] || A[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.set) {
    const [ex, i, k] = t.dataset.set.split('|'), log = (S.wlogs[UI.tDate] ||= {}), sets = (log[ex] ||= []), s = (sets[+i] ||= {});
    const v = k === 'kg' ? num(t.value) : parseInt(t.value);
    if (isNaN(v)) delete s[k]; else s[k] = v;
    save();
  }
  if (['g_kcal', 'g_p', 'g_c', 'g_g'].includes(t.id)) {
    const c = Math.round(num($('#g_p').value) * 4 + num($('#g_c').value) * 4 + num($('#g_g').value) * 9), k = num($('#g_kcal').value);
    $('#g_hint').innerHTML = `Macros somam ${fmt(c || 0)} kcal${Math.abs(c - k) > 50 ? ' <span class="warn">(diferente da meta)</span>' : ''}.`;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.pref) { const p = t.dataset.pref.split('.'); if (p.length === 2) S.prefs[p[0]][p[1]] = t.checked; else S.prefs[p[0]] = t.checked; save(); }
  if (t.dataset.cmp) { const k = t.dataset.cmp; if (k === 'pose') { UI.cmpPose = t.value; UI.cmpA = UI.cmpB = null; } else UI[k === 'a' ? 'cmpA' : 'cmpB'] = t.value; render(); }
});
$('#filePhoto').addEventListener('change', e => handlePhoto(e.target.files[0], photoPose));
$('#fileImport').addEventListener('change', e => { const f = e.target.files[0]; if (f) confirmSheet('Importar backup?', 'Os dados atuais deste aparelho serão substituídos pelos do arquivo.', 'Importar', () => doImport(f)); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheetWrap').hidden) closeSheet(); });

// ---------- PWA ----------
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; if (UI.tab === 'more') render(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

// atualiza "hoje" se o app ficar aberto de um dia pro outro
let lastDay = today();
document.addEventListener('visibilitychange', () => { if (!document.hidden && today() !== lastDay) { lastDay = today(); UI.dDate = UI.tDate = lastDay; render(); } });

loadPhotos().then(() => render(true));
render(true);
