// Pablo's IDE — app shell (Stage 1)
import { BOARDS, boardById } from './boards.js';
import { PROJECTS, projectById } from './projects.js';
import { COMPONENTS, SOURCES } from './components.js';
import { allocate, check, power, label } from './engine.js';
import { wiringSvg, pinoutSvg, blueprintSvg, pinTags, BOARD_COLORS } from './render.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------- state ----------------
const KEY = 'pablo-ide-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const S = Object.assign({ view: 'home', project: null, board: 'esp32-30', tab: 'blueprint', proj: {}, zoom: 1, pinSel: null }, load());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage unavailable */ } };
const pstate = (pid, bid) => {
  const k = pid + '@' + bid;
  S.proj[k] = S.proj[k] || { adv: [], sources: {}, overrides: {}, done: [] };
  return S.proj[k];
};

const ICONS = {
  car: '<path d="M5 15h14l-1.6-5.2A2 2 0 0 0 15.5 8.4h-7a2 2 0 0 0-1.9 1.4zM4 15v3h2v-1.5M20 15v3h-2v-1.5"/><circle cx="8" cy="15.5" r="1.4"/><circle cx="16" cy="15.5" r="1.4"/><path d="M9 5.5c1.8-1.3 4.2-1.3 6 0M10.5 7c.9-.6 2.1-.6 3 0"/>',
  plant: '<path d="M12 20v-8M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/><path d="M7 20h10"/>',
  cloud: '<path d="M7 17a4 4 0 0 1 .5-8A5 5 0 0 1 17 8a3.5 3.5 0 0 1 0 9z"/><path d="M12 12v3M10.5 13.5h3"/>',
  ruler: '<rect x="3" y="9" width="18" height="6" rx="1"/><path d="M7 9v3M11 9v3M15 9v3M19 9v2"/>',
  alarm: '<path d="M6 17h12l-1.5-2V11a4.5 4.5 0 0 0-9 0v4z"/><path d="M10.5 19.5a1.5 1.5 0 0 0 3 0M3.5 8a8 8 0 0 1 3-4M20.5 8a8 8 0 0 0-3-4"/>',
  traffic: '<rect x="8" y="3" width="8" height="16" rx="2.5"/><circle cx="12" cy="7" r="1.4"/><circle cx="12" cy="11" r="1.4"/><circle cx="12" cy="15" r="1.4"/><path d="M12 19v2"/>',
  robot: '<rect x="6" y="8" width="12" height="9" rx="2"/><circle cx="10" cy="12.5" r="1.2"/><circle cx="14" cy="12.5" r="1.2"/><path d="M12 8V5M10.5 4h3M4 12v3M20 12v3M8 17v2.5M16 17v2.5"/>',
  arm: '<path d="M5 20h8M9 20v-3l5-6 3 2M14 11l-3-5"/><circle cx="9" cy="17" r="1.2"/><circle cx="14" cy="11" r="1.2"/><path d="M17 13l2-1.5M17 13l1.5 2"/>',
  bin: '<path d="M6 8h12l-1 12H7zM5 8h14M9 8V6h6v2"/><path d="M10 11v6M14 11v6"/>',
  home: '<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 14.5v2.5"/>',
  key: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h.01M12 8h.01M15 8h.01M9 11.5h.01M12 11.5h.01M15 11.5h.01M9 15h.01M12 15h.01M15 15h.01"/>',
  air: '<path d="M4 9h11a3 3 0 1 0-3-3M4 13h14a3 3 0 1 1-3 3M4 17h6"/>',
  gps: '<path d="M12 21s6-5.5 6-11a6 6 0 0 0-12 0c0 5.5 6 11 6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  fire: '<path d="M12 21c-3.5 0-6-2.3-6-5.5 0-3 2-4.5 3-7 1 1.5 2 2 2 2 0-2.5 1-5 3-6.5 0 3 4 5.5 4 10 0 4-2.5 7-6 7z"/>',
  bulb: '<path d="M9 17h6M10 20h4M12 3a6 6 0 0 0-3.5 10.8c.4.4.5.9.5 1.4V17h6v-1.8c0-.5.2-1 .5-1.4A6 6 0 0 0 12 3z"/>',
  radar: '<path d="M4 18a8 8 0 0 1 16 0M7.5 18a4.5 4.5 0 0 1 9 0"/><path d="M12 18L17 11"/><circle cx="15" cy="13.5" r="0.8"/><path d="M3 18h18"/>',
  remote: '<rect x="8" y="3" width="8" height="18" rx="2.5"/><circle cx="12" cy="7" r="1.3"/><path d="M10.5 11h.01M13.5 11h.01M10.5 14h.01M13.5 14h.01M10.5 17h.01M13.5 17h.01"/>',
  rain: '<path d="M7 13a4 4 0 0 1 .5-8A5 5 0 0 1 17 4.5a3.5 3.5 0 0 1 0 8.5z"/><path d="M8 16l-1 3M12 16l-1 3M16 16l-1 3"/>',
  gate: '<path d="M4 20V9M4 11h16"/><path d="M7 11l2-2M10 11l2-2M13 11l2-2M16 11l2-2"/><circle cx="4" cy="8" r="1.4"/><path d="M2 20h5"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};
const icon = (n, cls = '') => `<svg viewBox="0 0 24 24" class="ic ${cls}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

const FAMILY_NAMES = { arduino: 'Arduino', esp32: 'ESP32', esp8266: 'ESP8266', rp2040: 'Pico', rpi: 'Raspberry Pi' };

// ---------------- routing ----------------
function go(view, extra = {}) { Object.assign(S, { view }, extra); save(); render(); window.scrollTo(0, 0); }
window.addEventListener('popstate', () => { if (S.view !== 'home') { S.view = S.view === 'board' ? 'boards' : 'home'; save(); render(); } });
document.addEventListener('backbutton', () => { if (S.view !== 'home') go(S.view === 'board' ? 'boards' : 'home'); });

// ---------------- views ----------------
function render() {
  const app = $('#app');
  if (S.view === 'project' && projectById(S.project)) app.innerHTML = viewProject();
  else if (S.view === 'boards') app.innerHTML = viewBoards();
  else if (S.view === 'board' && boardById(S.boardView)) app.innerHTML = viewBoard();
  else app.innerHTML = viewHome();
  bind();
  const on = document.querySelector('.bpick .chip.on');
  if (on) { const bp = on.closest('.bpick'); bp.scrollLeft = on.offsetLeft - bp.clientWidth / 2 + on.offsetWidth / 2; }
}

function topbar(title, sub, back) {
  return `<header class="top">${back ? `<button class="iconbtn" data-act="back" aria-label="Back">${icon('back')}</button>` : '<div class="logo"><span>P</span></div>'}
  <div class="tt"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div></header>`;
}

function viewHome() {
  return `${topbar("Pablo's IDE", 'Blueprint → pins → wiring → power')}
  <main class="pad">
    <section class="hero">
      <p class="kicker">12 boards · ${PROJECTS.length} projects · real pinouts</p>
      <h2>Pick a project, pick your board.</h2>
      <p>Pins, wiring and power are worked out from each board's real header and each module's real specs, then checked for conflicts and wrong voltages.</p>
    </section>
    <h3 class="sec">Projects · ${PROJECTS.length}</h3>
    <div class="filters">${['All', 'Starter', 'Beginner', 'Intermediate', 'Advanced'].map((l) => `<button class="fchip${(S.level || 'All') === l ? ' on' : ''}" data-act="level" data-id="${l}">${l}${l === 'All' ? '' : ' · ' + PROJECTS.filter((p) => p.level === l).length}</button>`).join('')}</div>
    <div class="cards">${PROJECTS.filter((p) => !S.level || S.level === 'All' || p.level === S.level).map((p) => `
      <button class="card" data-act="open" data-id="${p.id}">
        <div class="cic">${icon(p.icon)}</div>
        <div class="cbody"><div class="ctitle">${esc(p.name)} <span class="lvl ${p.level.toLowerCase()}">${p.level}</span>${p.needs === 'wifi' ? '<span class="lvl wifi">Wi-Fi</span>' : ''}</div><div class="csub">${esc(p.summary)}</div></div>
      </button>`).join('')}
    </div>
    <h3 class="sec">Boards</h3>
    <button class="card wide" data-act="boards"><div class="cic">${icon('chip')}</div><div class="cbody"><div class="ctitle">Board pinouts</div><div class="csub">All 12 boards: every pin, what it can do, what to avoid.</div></div></button>
    <p class="foot">Pablo's IDE · v1.1</p>
  </main>`;
}

function needsMiss(b) { const p = projectById(S.project); return p && p.needs === 'wifi' && !(b.wireless && b.wireless.wifi); }
function boardPicker() {
  const fams = [...new Set(BOARDS.map((b) => b.family))];
  return `<div class="bpick">${fams.map((f) => `<div class="bfam"><span>${FAMILY_NAMES[f]}</span>${BOARDS.filter((b) => b.family === f).map((b) => `<button class="chip${b.id === S.board ? ' on' : ''}${needsMiss(b) ? ' miss' : ''}" data-act="board" data-id="${b.id}" style="--bc:${BOARD_COLORS[b.family]}">${esc(b.short)}</button>`).join('')}</div>`).join('')}</div>`;
}

const TABS = [['blueprint', 'Blueprint'], ['parts', 'Parts'], ['pins', 'Pins'], ['wiring', 'Wiring'], ['power', 'Power'], ['check', 'Check']];

function computeAll() {
  const p = projectById(S.project), b = boardById(S.board);
  const st = pstate(p.id, b.id);
  const res = allocate(p, b, { adv: new Set(st.adv), sources: st.sources, overrides: st.overrides });
  const issues = check(res);
  const pw = power(res);
  return { p, b, st, res, issues, pw, all: [...issues, ...pw.issues] };
}

function viewProject() {
  const C = computeAll();
  const errs = C.all.filter((i) => i.level === 'error').length, warns = C.all.filter((i) => i.level === 'warn').length;
  const badge = errs ? `<i class="bd err">${errs}</i>` : warns ? `<i class="bd warn">${warns}</i>` : '<i class="bd ok">✓</i>';
  let body = '';
  switch (S.tab) {
    case 'parts': body = tabParts(C); break;
    case 'pins': body = tabPins(C); break;
    case 'wiring': body = tabWiring(C); break;
    case 'power': body = tabPower(C); break;
    case 'check': body = tabCheck(C); break;
    default: body = tabBlueprint(C);
  }
  return `${topbar(C.p.name, C.b.name, true)}
  ${boardPicker()}
  <nav class="tabs">${TABS.map(([k, n]) => `<button class="tab${S.tab === k ? ' on' : ''}" data-act="tab" data-id="${k}">${n}${k === 'check' ? badge : ''}</button>`).join('')}</nav>
  <main class="pad">${statusStrip(C, errs, warns)}${body}</main>`;
}

function statusStrip(C, errs, warns) {
  if (S.tab === 'check') return '';
  if (errs) return `<button class="strip err" data-act="tab" data-id="check">${errs} problem${errs > 1 ? 's' : ''} to fix on ${esc(C.b.short)} — tap to see</button>`;
  if (warns) return `<button class="strip warn" data-act="tab" data-id="check">${warns} thing${warns > 1 ? 's' : ''} to watch on ${esc(C.b.short)}</button>`;
  return `<div class="strip ok">Checked: no conflicts, voltages OK on ${esc(C.b.short)}</div>`;
}

function advToggles(C) {
  const advParts = C.p.parts.filter((x) => x.adv && (!x.when || x.when(C.b)));
  if (!advParts.length) return '';
  return `<div class="panel"><h4>Advanced add-ons</h4><p class="muted">Switch on to add them to the pins, wiring and power budget.</p>${advParts.map((x) => {
    const on = C.st.adv.includes(x.id);
    const def = COMPONENTS[x.c];
    return `<label class="tog"><input type="checkbox" data-act="adv" data-id="${x.id}" ${on ? 'checked' : ''}><span class="sw"></span><span><b>${esc(x.label)}</b><small>${esc(def.short)}${x.color ? ' (' + x.color + ')' : ''}</small></span></label>`;
  }).join('')}</div>`;
}

function tabBlueprint(C) {
  return `<div class="panel"><h4>How it works</h4><p>${esc(C.p.how)}</p></div>
  <div class="diagram dark">${blueprintSvg(C.res)}</div>
  <p class="legend"><span class="lg sig"></span>signals <span class="lg pwr"></span>power</p>
  ${C.res.notes.map((n) => `<div class="note-box">${icon('info')}<span>${esc(n.text)}</span></div>`).join('')}
  ${advToggles(C)}
  <div class="panel"><h4>Board: ${esc(C.b.name)}</h4>
    <dl class="specs"><dt>Chip</dt><dd>${esc(C.b.mcu)}</dd><dt>Logic</dt><dd>${C.b.logicV} V ${C.b.fiveVTolerant ? '' : '(pins are NOT 5 V tolerant)'}</dd><dt>Code</dt><dd>${esc(C.b.lang)}</dd><dt>Wireless</dt><dd>${C.b.wireless ? [C.b.wireless.wifi && 'Wi-Fi', C.b.wireless.bt && 'Bluetooth ' + C.b.wireless.bt].filter(Boolean).join(' · ') : 'None'}</dd></dl>
  </div>`;
}

function bomRows(C) {
  const rows = [];
  rows.push({ q: 1, n: C.b.name, d: C.b.mcu, k: 'board' });
  for (const part of C.res.parts) {
    if (part.source) { const s = SOURCES[part.sourceKey]; rows.push({ q: 1, n: s.name, d: part.label + (s.note ? ' · ' + s.note : ''), k: 'power', src: part }); continue; }
    if (part.def.isLed) { rows.push({ q: 1, n: `${part.color[0].toUpperCase() + part.color.slice(1)} LED (5 mm)`, d: part.label, k: part.adv ? 'adv' : 'basic' }); rows.push({ q: 1, n: `${part.res} Ω resistor`, d: `For ${part.label}: (${C.b.logicV} V − ${part.vf} V) ÷ ${part.res} Ω ≈ ${part.mA} mA`, k: 'auto' }); continue; }
    rows.push({ q: 1, n: part.def.name, d: part.label + ' — ' + part.def.desc, k: part.adv ? 'adv' : 'basic' });
  }
  const div = C.res.wires.filter((w) => w.divider).length;
  if (div) { rows.push({ q: div, n: '1 kΩ resistor', d: 'Voltage divider (top)', k: 'auto' }); rows.push({ q: div, n: '2 kΩ resistor (or 2× 1 kΩ / 2.2 kΩ)', d: 'Voltage divider (bottom)', k: 'auto' }); }
  if (C.res.wires.some((w) => w.shifter)) rows.push({ q: 1, n: '4-channel I2C level shifter (BSS138)', d: 'Between the 3.3 V board and the 5 V I2C module', k: 'auto' });
  for (const e of C.p.extras) rows.push({ q: e.qty, n: e.name, d: '', k: 'extra' });
  // merge duplicates
  const m = new Map();
  for (const r of rows) { const k = r.n + '|' + r.k; if (m.has(k) && r.k !== 'power') { m.get(k).q += r.q; m.get(k).d += ' · ' + r.d; } else m.set(k, { ...r }); }
  return [...m.values()];
}

function tabParts(C) {
  const rows = bomRows(C);
  const sec = (k, title) => { const r = rows.filter((x) => x.k === k); return r.length ? `<h4 class="bomh">${title}</h4>${r.map((x) => `<div class="bom"><span class="q">${x.q}×</span><div><b>${esc(x.n)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}${x.src ? sourcePicker(C, x.src) : ''}</div></div>`).join('')}` : ''; };
  return `<div class="panel">${sec('board', 'Board')}${sec('basic', 'Basic parts')}${sec('power', 'Power')}${sec('auto', 'Added for this board')}${sec('adv', 'Advanced add-ons')}${sec('extra', 'Also needed')}</div>${advToggles(C)}`;
}

function sourcePicker(C, part) {
  const opts = part.options || [part.def];
  if (opts.length < 2) return '';
  return `<div class="seg">${opts.map((k) => `<button class="${part.sourceKey === k ? 'on' : ''}" data-act="src" data-part="${part.id}" data-id="${k}">${esc(SOURCES[k].short)}</button>`).join('')}</div>`;
}

function reqLabel(r) { const b = r.split(':')[0]; return { pwm: 'PWM', dout: 'Digital OUT', din: 'Digital IN', 'din-pu': 'IN + pull-up', dio: 'Digital IN/OUT', adc: 'Analog IN', sda: 'I2C SDA', scl: 'I2C SCL', 'uart-rx': 'Serial RX', 'uart-tx': 'Serial TX', GND: 'Ground', VCC: 'Power', FEED: 'Board power in' }[b] || b; }

function tabPins(C) {
  const sig = C.res.wires.filter((w) => w.kind === 'sig');
  const pwr = C.res.wires.filter((w) => w.board && w.kind !== 'sig');
  const bad = new Set(C.all.filter((i) => i.level === 'error').flatMap((i) => i.keys || []));
  const warnK = new Set(C.all.filter((i) => i.level === 'warn').flatMap((i) => i.keys || []));
  const ioPins = C.b.pins.filter((p) => p.t === 'io' && !p.alias);
  const row = (w, editable) => {
    const cls = bad.has(w.key) ? ' err' : warnK.has(w.key) ? ' warn' : '';
    const pinName = w.board ? w.board.n : '—';
    const extra = [w.divider ? 'via 1k/2k divider' : '', w.shifter ? 'via level shifter' : '', w.soft ? 'SoftwareSerial' : '', w.uart && !w.soft ? w.uart : '', w.fallback ? 'digital fallback' : ''].filter(Boolean).join(' · ');
    const sel = editable ? `<select data-act="override" data-key="${esc(w.key)}">${ioPins.map((p) => `<option value="${p.id}" ${w.board && w.board.id === p.id ? 'selected' : ''}>${esc(p.n)}${p.flash || p.reserved ? ' ✕' : ''}${pinTags(p).length ? ' · ' + pinTags(p).map((t) => t.t).join(' ') : ''}</option>`).join('')}</select>` : '';
    return `<div class="prow${cls}"><span class="dot" style="background:${w.color}"></span><div class="pm"><b>${esc(label(C.res, w.part))}</b> <code>${esc(w.pinDef.id)}</code><small>${reqLabel(w.req)}${extra ? ' · ' + extra : ''}</small></div><div class="pb"><code class="big">${esc(pinName)}</code>${sel}</div></div>`;
  };
  const anyOverride = Object.keys(C.st.overrides).length;
  return `<div class="panel"><h4>Signal pins</h4><p class="muted">Picked automatically from ${esc(C.b.short)}'s real pin functions. Change any pin with the dropdown — the checker re-runs instantly.</p>
    ${sig.map((w) => row(w, !!w.board || w.fail)).join('')}
    ${anyOverride ? '<button class="btn ghost" data-act="resetpins">Reset to automatic pins</button>' : ''}</div>
  <div class="panel"><h4>Power & ground</h4>${pwr.map((w) => row(w, false)).join('')}</div>`;
}

function tabWiring(C) {
  const all = C.res.wires.filter((w) => !(C.res.byId[w.part] && C.res.byId[w.part].usbOnly));
  const done = new Set(C.st.done);
  const n = all.filter((w) => done.has(w.key)).length;
  const sel = S.wireSel && all.find((w) => w.key === S.wireSel);
  const desc = (w) => {
    const from = `${label(C.res, w.part)} ${w.pinDef.id}`;
    const to = w.board ? `${C.b.short} ${w.board.n}` : `${label(C.res, w.bPart)} ${w.bPinDef.id}`;
    let via = '';
    if (w.divider && w.divider.dir === 'in') via = ` <em>(${w.pinDef.id} → 1 kΩ → ${w.board.n}; ${w.board.n} → 2 kΩ → GND)</em>`;
    if (w.divider && w.divider.dir === 'out') via = ` <em>(${w.board.n} → 1 kΩ → ${w.pinDef.id}; ${w.pinDef.id} → 2 kΩ → GND)</em>`;
    if (w.shifter) via = ' <em>(through level shifter: board → LV side, module → HV side)</em>';
    return `<b>${esc(from)}</b> → <b>${esc(to)}</b>${via}${w.note ? `<small>${esc(w.note)}</small>` : ''}`;
  };
  return `<div class="zoombar"><button class="btn sm" data-act="zoom" data-id="-1">−</button><span>${S.zoom ? Math.round(S.zoom * 100) + '%' : 'Fit'}</span><button class="btn sm" data-act="zoom" data-id="1">+</button><span class="muted">Tap a wire to highlight it</span></div>
  <div class="diagram scroll" id="wdiag">${wiringSvg(C.res, { zoom: S.zoom, selected: S.wireSel, done })}</div>
  ${sel ? `<div class="wsel"><span class="dot" style="background:${sel.color}"></span><div>${desc(sel)}</div></div>` : ''}
  <div class="panel"><h4>Build mode</h4><p class="muted">Tick each wire as you connect it. GND first, power last.</p>
    <div class="prog"><i style="width:${all.length ? (n / all.length) * 100 : 0}%"></i></div><p class="muted">${n} of ${all.length} wires done</p>
    <ol class="steps">${C.p.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    ${orderWires(all).map((w) => `<label class="wchk${done.has(w.key) ? ' done' : ''}"><input type="checkbox" data-act="done" data-key="${esc(w.key)}" ${done.has(w.key) ? 'checked' : ''}><span class="dot" style="background:${w.color}"></span><span>${desc(w)}</span></label>`).join('')}
    ${n ? '<button class="btn ghost" data-act="resetdone">Clear ticks</button>' : ''}
  </div>`;
}
const orderWires = (ws) => { const rank = (w) => (w.kind === 'gnd' || w.kind === 'auxneg' ? 0 : w.kind === 'sig' || w.kind === 'aux' ? 1 : 2); return ws.slice().sort((a, b) => rank(a) - rank(b)); };

function tabPower(C) {
  const { pw } = C;
  const fmt = (x) => (x >= 1000 ? (x / 1000).toFixed(2) + ' A' : Math.round(x) + ' mA');
  const groups = pw.groups.map((g) => {
    const pct = Math.min(100, (g.peak / g.max) * 100);
    const srcPick = C.res.parts.find((p) => p.id === g.part.id);
    return `<div class="panel"><h4>${esc(g.label)}: ${esc(g.src.name)}</h4>${sourcePicker(C, srcPick)}
      <table class="tbl"><tr><th>Load</th><th>Avg</th><th>Peak</th></tr>${g.loads.map((l) => `<tr><td>${esc(l.name)}${l.via ? `<small>via ${esc(l.via)}</small>` : ''}</td><td>${fmt(l.avg)}</td><td>${fmt(l.peak)}</td></tr>`).join('')}
      <tr class="tot"><td>Total</td><td>${fmt(g.avg)}</td><td>${fmt(g.peak)}</td></tr></table>
      <div class="meter"><i style="width:${pct}%" class="${g.peak > g.max ? 'over' : pct > 80 ? 'hi' : ''}"></i></div>
      <p class="muted">Peak ${fmt(g.peak)} of ${fmt(g.max)} available${g.motorV ? ` · motors get ~${g.motorV.toFixed(1)} V after the L298N` : ''}${g.reg ? ` · L298N 5 V regulator ${fmt(g.reg.load)} / ${fmt(g.reg.max)}` : ''}${g.buck ? ` · buck 5 V output peak ${fmt(g.buck.load)} / ${fmt(g.buck.max)}` : ''}</p>
      ${g.hours ? `<p class="big">≈ ${g.hours >= 1 ? g.hours.toFixed(1) + ' h' : Math.round(g.hours * 60) + ' min'} runtime</p><p class="muted">At average current, using 80 % of ${Math.round(g.src.mAh)} mAh.</p>` : ''}
    </div>`;
  }).join('');
  const rails = pw.rails.filter((r) => r.loads.length).map((r) => `<div class="rail"><div class="rl"><b>${r.rail} rail</b><span>${fmt(r.peak)} / ${fmt(r.max)}</span></div><div class="meter"><i style="width:${Math.min(100, (r.peak / r.max) * 100)}%" class="${r.peak > r.max ? 'over' : r.peak > r.max * 0.8 ? 'hi' : ''}"></i></div><small>${esc(r.note)}</small></div>`).join('');
  return `${groups}<div class="panel"><h4>Board supply rails</h4>${rails || '<p class="muted">No modules on the board rails.</p>'}</div>
  ${issuesHtml(pw.issues)}`;
}

function issuesHtml(list) {
  return list.map((i) => `<div class="issue ${i.level}"><div class="it"><span class="lv">${i.level === 'error' ? 'FIX' : i.level === 'warn' ? 'WATCH' : 'NOTE'}</span>${esc(i.title)}</div><p>${esc(i.detail)}</p>${i.fix ? `<p class="fix">→ ${esc(i.fix)}</p>` : ''}</div>`).join('');
}

function tabCheck(C) {
  const e = C.all.filter((i) => i.level === 'error'), w = C.all.filter((i) => i.level === 'warn'), n = C.all.filter((i) => i.level === 'info');
  return `<div class="summary"><div class="${e.length ? 'err' : 'ok'}"><b>${e.length}</b>problems</div><div class="${w.length ? 'warn' : 'ok'}"><b>${w.length}</b>warnings</div><div><b>${n.length}</b>notes</div></div>
  ${!e.length && !w.length ? `<div class="panel okbox"><h4>All clear on ${esc(C.b.short)}</h4><p>No pin conflicts, no wrong voltages, no overloaded rails.</p></div>` : ''}
  ${issuesHtml(C.all)}
  <p class="muted small">Checks: pin conflicts, pin abilities, input-only / flash / reserved / boot pins, USB-serial pins, 5 V into 3.3 V, 3.3 V into 5 V-only inputs, pull-ups, Pico PWM slices, I2C addresses, LED current, total pin current, rail budgets, battery & regulator limits.</p>`;
}

// ---------------- boards ----------------
function viewBoards() {
  return `${topbar('Boards', '12 boards · real headers', true)}<main class="pad"><div class="cards">${BOARDS.map((b) => `
    <button class="card" data-act="boardview" data-id="${b.id}"><div class="cic" style="background:${BOARD_COLORS[b.family]}">${icon('chip')}</div><div class="cbody"><div class="ctitle">${esc(b.name)}</div><div class="csub">${esc(b.mcu)} · ${b.logicV} V · ${b.pins.filter((p) => p.t === 'io' && !p.alias && !p.flash && !p.reserved && p.caps.length).length} usable I/O</div></div></button>`).join('')}</div></main>`;
}

function viewBoard() {
  const b = boardById(S.boardView);
  const p = S.pinSel && b.pins.find((x) => x.id === S.pinSel);
  const capNames = { din: 'Digital in', dout: 'Digital out', pwm: 'PWM', adc: 'Analog in', sda: 'I2C SDA', scl: 'I2C SCL', rx: 'Serial RX', tx: 'Serial TX', spi: 'SPI', int: 'Interrupt', dac: 'DAC (analog out)' };
  const detail = p ? `<div class="pindet"><h4>${esc(p.n)}${p.g && p.t === 'io' ? ` <code>${b.family === 'rpi' ? 'BCM ' : b.family === 'arduino' ? 'pin ' : 'GPIO '}${esc(p.gpio ?? p.g)}</code>` : ''}${p.phys ? ` <small>physical pin ${p.phys}</small>` : ''}</h4>
    ${p.alias ? `<p>Same electrical pin as <b>${esc(p.alias)}</b>.</p>` : ''}
    ${p.caps.length ? `<p>${p.caps.map((c) => `<span class="cap">${capNames[c] || c}</span>`).join('')}${p.softpwm ? '<span class="cap soft">software PWM</span>' : ''}</p>` : ''}
    ${p.note ? `<p>${esc(p.note)}</p>` : ''}
    ${p.strap ? `<p class="w">⚠ ${esc(p.strap)}</p>` : ''}${p.inputOnly ? '<p class="w">⚠ Input only — cannot drive outputs. No internal pull-up/down.</p>' : ''}${p.usb ? '<p class="w">⚠ Shared with USB serial.</p>' : ''}${p.flash ? '<p class="e">✕ Connected to internal flash. Never use.</p>' : ''}${p.boot ? `<p class="w">⚠ ${esc(p.boot)}</p>` : ''}
    ${p.t === 'pwr' ? `<p>Power pin (${esc(p.rail)} rail). ${esc(b.power.railNote[p.rail === 'VIN' ? '5V' : p.rail] || '')}</p>` : ''}</div>` : '<p class="muted">Tap any pin to see what it can do.</p>';
  return `${topbar(b.name, b.mcu, true)}<main class="pad">
  <div class="panel"><dl class="specs"><dt>Logic</dt><dd>${b.logicV} V${b.fiveVTolerant ? '' : ' — NOT 5 V tolerant'}</dd><dt>Memory</dt><dd>${esc(b.memory)}</dd><dt>Code</dt><dd>${esc(b.lang)}</dd><dt>Pin current</dt><dd>${b.pinRec} mA recommended, ${b.pinMax} mA max</dd><dt>Power in</dt><dd>${b.power.inputs.map((i) => esc(i.label)).join('<br>')}</dd></dl>${b.layoutNote ? `<p class="muted">${esc(b.layoutNote)}</p>` : ''}</div>
  ${detail}
  <div class="diagram">${pinoutSvg(b, { selected: S.pinSel })}</div>
  <p class="legend tags"><i style="background:#16A34A">ADC</i><i style="background:#7C3AED">PWM</i><i style="background:#0284C7">I2C</i><i style="background:#CA8A04">UART</i><i style="background:#EA580C">IN only</i><i style="background:#DC2626">avoid</i></p>
  </main>`;
}

// ---------------- events ----------------
function bind() {
  document.querySelectorAll('[data-act]').forEach((el) => {
    const act = el.dataset.act;
    const ev = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'click';
    el.addEventListener(ev, (e) => handle(act, el, e));
  });
  const wd = $('#wdiag');
  if (wd) wd.addEventListener('click', (e) => {
    const g = e.target.closest('[data-wire]');
    S.wireSel = g ? (S.wireSel === g.dataset.wire ? null : g.dataset.wire) : null;
    const sx = wd.scrollLeft, sy = window.scrollY; save(); render(); const nd = $('#wdiag'); if (nd) nd.scrollLeft = sx; window.scrollTo(0, sy);
  });
  document.querySelectorAll('.pinout [data-pin]').forEach((g) => g.addEventListener('click', () => { S.pinSel = g.dataset.pin; save(); const y = window.scrollY; render(); window.scrollTo(0, y); }));
}

function handle(act, el) {
  const keepScroll = () => { const y = window.scrollY; const d = $('#wdiag'); const x = d ? d.scrollLeft : 0; save(); render(); window.scrollTo(0, y); const nd = $('#wdiag'); if (nd) nd.scrollLeft = x; };
  const st = S.project ? pstate(S.project, S.board) : null;
  switch (act) {
    case 'back': history.length > 1 && S.view !== 'home' ? go(S.view === 'board' ? 'boards' : 'home') : go('home'); break;
    case 'open': history.pushState({}, ''); go('project', { project: el.dataset.id, tab: 'blueprint', wireSel: null }); break;
    case 'boards': history.pushState({}, ''); go('boards'); break;
    case 'boardview': history.pushState({}, ''); go('board', { boardView: el.dataset.id, pinSel: null }); break;
    case 'board': S.board = el.dataset.id; S.wireSel = null; keepScroll(); break;
    case 'tab': S.tab = el.dataset.id; save(); render(); break;
    case 'level': S.level = el.dataset.id; save(); render(); break;
    case 'adv': { const id = el.dataset.id; st.adv = el.checked ? [...new Set([...st.adv, id])] : st.adv.filter((x) => x !== id); st.overrides = {}; keepScroll(); break; }
    case 'src': st.sources[el.dataset.part] = el.dataset.id; keepScroll(); break;
    case 'override': st.overrides[el.dataset.key] = el.value; keepScroll(); break;
    case 'resetpins': st.overrides = {}; keepScroll(); break;
    case 'done': { const k = el.dataset.key; st.done = el.checked ? [...new Set([...st.done, k])] : st.done.filter((x) => x !== k); keepScroll(); break; }
    case 'resetdone': st.done = []; keepScroll(); break;
    case 'zoom': { const z = (S.zoom || 0.6) + 0.2 * +el.dataset.id; S.zoom = z < 0.5 ? 0 : Math.min(2.4, +z.toFixed(1)); keepScroll(); break; }
  }
}

render();
