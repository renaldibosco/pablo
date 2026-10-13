// Pablo's IDE — SVG renderers: wiring diagram, board pinout, blueprint.
// Every line drawn here comes from the allocation data: no decorative wires.
import { COMPONENTS, SOURCES } from './components.js';

const P = 24;          // pin pitch
const BW = 176;        // board width
const CW = 136;        // module width
const HEAD = 30;       // module header height
const LANE = 9;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const BOARD_COLORS = { arduino: '#0B6E99', esp32: '#1F2937', esp8266: '#111827', rp2040: '#15803D', rpi: '#166534' };
const CAT_COLORS = { 'Motor driver': '#B91C1C', Wireless: '#1D4ED8', Sensor: '#0369A1', Display: '#334155', Actuator: '#7C2D12', Output: '#6D28D9', Input: '#0F766E', Power: '#B45309' };

function pinFill(p) {
  if (p.t === 'pwr') return '#EF4444';
  if (p.t === 'gnd') return '#0F172A';
  if (p.t === 'nc' || p.t === 'ctl') return '#94A3B8';
  if (p.flash || p.reserved) return '#64748B';
  return '#E2E8F0';
}

// ---------- Board drawing (shared by wiring + pinout) ----------
function boardSvg(b, x, y, opts = {}) {
  const rows = Math.max(b.cols.left.length, b.cols.right.length);
  const h = 48 + rows * P + 14;
  const col = BOARD_COLORS[b.family] || '#1F2937';
  const out = [];
  out.push(`<rect x="${x}" y="${y}" width="${BW}" height="${h}" rx="10" fill="${col}" stroke="#0F172A" stroke-width="1.5"/>`);
  out.push(`<text x="${x + BW / 2}" y="${y + 20}" text-anchor="middle" class="bt">${esc(b.short)}</text>`);
  out.push(`<text x="${x + BW / 2}" y="${y + 34}" text-anchor="middle" class="bs">${esc(b.logicV)} V logic</text>`);
  for (const side of ['left', 'right']) {
    for (const p of b.cols[side]) {
      const py = y + 48 + p.row * P + P / 2;
      const px = side === 'left' ? x : x + BW;
      p._x = px; p._y = py;
      const used = opts.used && opts.used.has(p.id);
      const sel = opts.selected === p.id;
      const ring = used ? opts.used.get(p.id) : null;
      const fill = pinFill(p);
      const tx = side === 'left' ? x + 12 : x + BW - 12;
      const anchor = side === 'left' ? 'start' : 'end';
      const dim = opts.dimUnused && !used && p.t === 'io';
      out.push(`<g class="bpin${sel ? ' sel' : ''}" data-pin="${p.id}">`);
      out.push(`<rect x="${side === 'left' ? x + 2 : x + BW / 2}" y="${py - P / 2 + 1}" width="${BW / 2 - 2}" height="${P - 2}" fill="transparent"/>`);
      out.push(`<circle cx="${px}" cy="${py}" r="${ring ? 6 : 5}" fill="${fill}" stroke="${ring || '#0F172A'}" stroke-width="${ring ? 3 : 1}"/>`);
      if (p.flash || p.reserved) out.push(`<path d="M${px - 4} ${py - 4}L${px + 4} ${py + 4}M${px + 4} ${py - 4}L${px - 4} ${py + 4}" stroke="#F87171" stroke-width="1.6"/>`);
      const phys = p.phys ? `<tspan class="bphys">${p.phys} </tspan>` : '';
      out.push(`<text x="${tx}" y="${py + 4}" text-anchor="${anchor}" class="bpl${dim ? ' dim' : ''}${p.t !== 'io' ? ' pw' : ''}">${side === 'left' ? phys + esc(p.n) : esc(p.n) + (p.phys ? `<tspan class="bphys"> ${p.phys}</tspan>` : '')}</text>`);
      out.push('</g>');
    }
  }
  return { svg: out.join(''), h };
}

function sourcePins() { return [{ id: '+', role: 'pin' }, { id: '-', role: 'pin' }]; }

// ---------- Wiring diagram ----------
export function wiringSvg(res, opts = {}) {
  const { board: b, wires, parts } = res;
  const shown = parts.filter((p) => !(p.source && p.usbOnly));
  const partById = Object.fromEntries(shown.map((p) => [p.id, p]));
  const bWires = wires.filter((w) => w.board && partById[w.part]);
  const cWires = wires.filter((w) => w.b && partById[w.part] && partById[w.bPart]);

  // which edge each module pin sits on
  const pinEdges = {};
  const mark = (pid, pin, edge) => { const k = pid + '.' + pin; (pinEdges[k] = pinEdges[k] || new Set()).add(edge); };
  // side of each module
  const side = {};
  for (const p of shown) {
    const ws = bWires.filter((w) => w.part === p.id && w.kind === 'sig');
    if (!ws.length) continue;
    const l = ws.filter((w) => w.board.side === 'left').length;
    side[p.id] = l > ws.length - l ? 'left' : 'right';
  }
  const tier = {};
  for (const p of shown) tier[p.id] = bWires.some((w) => w.part === p.id) ? 0 : 1;
  // modules with only power wires go next to the modules they connect to
  for (let k = 0; k < 3; k++) for (const p of shown) if (!side[p.id]) {
    const partner = cWires.find((w) => (w.part === p.id && side[w.bPart]) || (w.bPart === p.id && side[w.part]));
    if (partner) side[p.id] = side[partner.part === p.id ? partner.bPart : partner.part];
  }
  for (const p of shown) if (!side[p.id]) { const w = bWires.find((x) => x.part === p.id); side[p.id] = w ? w.board.side : 'right'; }

  for (const w of bWires) mark(w.part, w.pinDef.id, 'inner');
  for (const w of cWires) {
    mark(w.part, w.pinDef.id, tier[w.part] === 0 ? 'outer' : 'inner');
    mark(w.bPart, w.bPinDef.id, tier[w.bPart] === 0 ? 'outer' : 'inner');
  }

  // board geometry
  const rowsB = Math.max(b.cols.left.length, b.cols.right.length);
  const boardH = 48 + rowsB * P + 14;
  const crossWires = bWires.filter((w) => w.board.side !== side[w.part]);
  const laneCount = { left: 0, right: 0 };
  for (const w of bWires) laneCount[side[w.part]]++;
  for (const w of crossWires) laneCount[w.board.side]++;
  const outerLanes = { left: 0, right: 0 };
  for (const w of cWires) { outerLanes[side[w.part]]++; if (side[w.bPart] !== side[w.part]) outerLanes[side[w.bPart]]++; }

  const gap = (s) => 26 + laneCount[s] * LANE;
  const ogap = (s) => (outerLanes[s] ? 26 + outerLanes[s] * LANE : 0);
  const hasTier1 = (s) => shown.some((p) => side[p.id] === s && tier[p.id] === 1);
  const hasTier0 = (s) => shown.some((p) => side[p.id] === s && tier[p.id] === 0);
  const leftW = (hasTier0('left') ? gap('left') + CW : 16) + (outerLanes.left ? ogap('left') : 0) + (hasTier1('left') ? CW : 0) + 12;
  const bx = leftW;
  const by = 20;
  const board = boardSvg(b, bx, by, { used: usedColors(res), dimUnused: true });

  // module geometry
  const modPins = (p) => (p.def ? p.def.pins : sourcePins());
  const modH = (p) => {
    const pins = modPins(p);
    const inner = pins.filter((x) => edgeOf(p, x) === 'inner').length;
    const outer = pins.filter((x) => (pinEdges[p.id + '.' + x.id] || new Set()).has('outer')).length;
    return HEAD + Math.max(inner, outer, 1) * P + 8;
  };
  const edgeOf = (p, x) => { const e = pinEdges[p.id + '.' + x.id]; if (!e) return 'inner'; return e.has('inner') ? 'inner' : 'outer'; };
  const geo = {};
  const pinY = {}; // 'part.pin.edge' -> {x,y}

  const placeColumn = (s, t) => {
    const mods = shown.filter((p) => side[p.id] === s && tier[p.id] === t);
    const meanY = (p) => {
      let ys;
      if (t === 0) ys = bWires.filter((w) => w.part === p.id).map((w) => w.board._y);
      else ys = cWires.filter((w) => w.part === p.id || w.bPart === p.id).map((w) => { const o = w.part === p.id ? w.bPart : w.part; return geo[o] ? geo[o].y + geo[o].h / 2 : by + boardH / 2; });
      return ys.length ? ys.reduce((a, c) => a + c, 0) / ys.length : by + boardH / 2;
    };
    mods.sort((a, c) => meanY(a) - meanY(c));
    let cursor = by;
    for (const p of mods) {
      const h = modH(p);
      const y = Math.max(cursor, meanY(p) - h / 2);
      let x;
      if (s === 'right') x = t === 0 ? bx + BW + gap('right') : bx + BW + (hasTier0('right') ? gap('right') + CW : 16) + ogap('right');
      else x = t === 0 ? bx - gap('left') - CW : bx - (hasTier0('left') ? gap('left') + CW : 16) - ogap('left') - CW;
      geo[p.id] = { x, y, h, s, t };
      cursor = y + h + 22;
    }
  };
  placeColumn('left', 0); placeColumn('right', 0); placeColumn('left', 1); placeColumn('right', 1);

  // module pin coordinates
  const modSvg = [];
  for (const p of shown) {
    const g = geo[p.id];
    const s = g.s;
    const innerX = s === 'right' ? g.x : g.x + CW;
    const outerX = s === 'right' ? g.x + CW : g.x;
    const pins = modPins(p);
    let ii = 0, oi = 0;
    const def = p.def;
    const src = p.source ? SOURCES[p.sourceKey] : null;
    const cat = def ? def.cat : 'Power';
    const title = p.label;
    const sub = def ? (p.def.isLed ? `${p.color} LED · ${p.res || '?'} Ω` : def.short) : src.short + ' · ' + src.v + ' V';
    modSvg.push(`<g class="mod" data-part="${p.id}"><rect x="${g.x}" y="${g.y}" width="${CW}" height="${g.h}" rx="8" fill="#FFFFFF" stroke="#334155" stroke-width="1.2"/>`);
    modSvg.push(`<path d="M${g.x} ${g.y + 8}a8 8 0 0 1 8 -8h${CW - 16}a8 8 0 0 1 8 8v${HEAD - 8}h-${CW}z" fill="${CAT_COLORS[cat] || '#334155'}"/>`);
    modSvg.push(`<text x="${g.x + CW / 2}" y="${g.y + 13}" text-anchor="middle" class="mt">${esc(title)}</text>`);
    modSvg.push(`<text x="${g.x + CW / 2}" y="${g.y + 25}" text-anchor="middle" class="ms">${esc(sub)}</text>`);
    for (const x of pins) {
      const e = pinEdges[p.id + '.' + x.id] || new Set(['inner']);
      for (const edge of ['inner', 'outer']) {
        if (!e.has(edge)) continue;
        const i = edge === 'inner' ? ii++ : oi++;
        const py = g.y + HEAD + 4 + i * P + P / 2;
        const px = edge === 'inner' ? innerX : outerX;
        pinY[p.id + '.' + x.id + '.' + edge] = { x: px, y: py };
        const connected = pinEdges[p.id + '.' + x.id];
        const lx = px === g.x ? g.x + 10 : g.x + CW - 10;
        const anchor = px === g.x ? 'start' : 'end';
        modSvg.push(`<circle cx="${px}" cy="${py}" r="4.5" fill="${connected ? '#0F172A' : '#CBD5E1'}"/>`);
        modSvg.push(`<text x="${lx}" y="${py + 4}" text-anchor="${anchor}" class="mpl${connected ? '' : ' dim'}">${esc(x.label || x.id)}</text>`);
      }
    }
    modSvg.push('</g>');
  }

  // routing
  let modBottom = by + boardH;
  for (const g of Object.values(geo)) modBottom = Math.max(modBottom, g.y + g.h);
  const wireSvg = [];
  const badges = [];
  const laneUsed = { left: 0, right: 0 };
  const oLaneUsed = { left: 0, right: 0 };
  const laneX = (s) => { const i = laneUsed[s]++; return s === 'right' ? bx + BW + 16 + i * LANE : bx - 16 - i * LANE; };
  const oLaneX = (s) => {
    const i = oLaneUsed[s]++;
    const base = s === 'right' ? bx + BW + (hasTier0('right') ? gap('right') + CW : 16) + 14 : bx - (hasTier0('left') ? gap('left') + CW : 16) - 14;
    return s === 'right' ? base + i * LANE : base - i * LANE;
  };
  let bottomLane = 0;
  const sel = opts.selected;
  const path = (pts) => 'M' + pts.map((q) => q[0] + ' ' + q[1]).join('L');
  const drawn = (w, pts, extra = '') => {
    const cls = 'wire' + (sel && sel !== w.key ? ' faded' : '') + (sel === w.key ? ' sel' : '') + (opts.done && opts.done.has(w.key) ? ' done' : '');
    wireSvg.push(`<g class="${cls}" data-wire="${esc(w.key)}"><path d="${path(pts)}" class="hit"/><path d="${path(pts)}" stroke="${w.color}" class="ln${w.kind === 'gnd' || w.kind === 'auxneg' ? ' gnd' : ''}"/>${extra}</g>`);
  };
  // sort for fewer crossings: board wires by pin y
  const sorted = bWires.slice().sort((a, c) => a.board._y - c.board._y);
  for (const w of sorted) {
    const s = side[w.part];
    const end = pinY[w.part + '.' + w.pinDef.id + '.inner'];
    if (!end) continue;
    const p0 = [w.board._x, w.board._y];
    let pts;
    if (w.board.side === s) {
      const lx = laneX(s);
      pts = [p0, [lx, p0[1]], [lx, end.y], [end.x, end.y]];
    } else {
      const l1 = laneX(w.board.side);
      const yb = modBottom + 18 + bottomLane++ * LANE;
      const l2 = laneX(s);
      pts = [p0, [l1, p0[1]], [l1, yb], [l2, yb], [l2, end.y], [end.x, end.y]];
    }
    let extra = '';
    if (w.divider || w.shifter) {
      const [ax, ay] = pts[pts.length - 2];
      const mx = end.x + (ax < end.x ? -38 : 38), my = end.y;
      const t = w.divider ? '÷ 1k/2k' : '⇅ shifter';
      badges.push(`<g class="badge"><rect x="${mx - 30}" y="${my - 9}" width="60" height="18" rx="9" fill="#FEF3C7" stroke="#B45309"/><text x="${mx}" y="${my + 4}" text-anchor="middle">${t}</text></g>`);
      void ax; void ay;
    }
    drawn(w, pts, extra);
  }
  for (const w of cWires) {
    const s = side[w.part];
    const a = pinY[w.part + '.' + w.pinDef.id + '.' + (tier[w.part] === 0 ? 'outer' : 'inner')];
    const c = pinY[w.bPart + '.' + w.bPinDef.id + '.' + (tier[w.bPart] === 0 ? 'outer' : 'inner')];
    if (!a || !c) continue;
    const s2 = side[w.bPart];
    if (s === s2) {
      const lx = oLaneX(s);
      drawn(w, [[a.x, a.y], [lx, a.y], [lx, c.y], [c.x, c.y]]);
    } else {
      const l1 = oLaneX(s), l2 = oLaneX(s2);
      const yb = modBottom + 18 + bottomLane++ * LANE;
      drawn(w, [[a.x, a.y], [l1, a.y], [l1, yb], [l2, yb], [l2, c.y], [c.x, c.y]]);
    }
  }

  // canvas size
  let maxX = bx + BW + 20, maxY = modBottom + 24 + bottomLane * LANE;
  let minX = 0;
  for (const g of Object.values(geo)) { maxX = Math.max(maxX, g.x + CW + 16); maxY = Math.max(maxY, g.y + g.h + 16); minX = Math.min(minX, g.x - 16); }
  const W = maxX - minX, H = maxY + 10;
  const usbNote = parts.filter((p) => p.source && p.usbOnly).map((p) => `${p.label}: ${SOURCES[p.sourceKey].short} into the board's ${b.family === 'rpi' ? 'USB-C' : 'USB'} port`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} 0 ${W} ${H + (usbNote.length ? 22 : 0)}" width="${opts.zoom ? Math.round(W * opts.zoom) : '100%'}" class="wiring">
  <defs><pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#E2E8F0" stroke-width="0.6"/></pattern></defs>
  <rect x="${minX}" y="0" width="${W}" height="${H + 22}" fill="#F8FAFC"/><rect x="${minX}" y="0" width="${W}" height="${H + 22}" fill="url(#grid)"/>
  ${board.svg}${wireSvg.join('')}${modSvg.join('')}${badges.join('')}
  ${usbNote.map((t, i) => `<text x="${minX + 12}" y="${H + 8 + i * 14}" class="note">⚡ ${esc(t)}</text>`).join('')}
</svg>`;
  return svg;
}

export function usedColors(res) {
  const m = new Map();
  for (const w of res.wires) if (w.board) { const p = w.board.alias ? res.board.byName(w.board.alias) : w.board; m.set(w.board.id, w.color); if (p) m.set(p.id, w.color); }
  return m;
}

// ---------- Board pinout explorer ----------
export function pinoutSvg(b, opts = {}) {
  const { svg, h } = boardSvg(b, 70, 16, { selected: opts.selected });
  // capability tags beside each pin
  const tags = [];
  for (const p of b.pins) {
    const t = pinTags(p);
    if (!t.length) continue;
    const left = p.side === 'left';
    let x = left ? 62 : 70 + BW + 8;
    for (const tg of t) {
      const w = tg.t.length * 5.6 + 8;
      const rx = left ? x - w : x;
      tags.push(`<g class="tag"><rect x="${rx}" y="${p._y - 7}" width="${w}" height="14" rx="3" fill="${tg.c}"/><text x="${rx + w / 2}" y="${p._y + 3.5}" text-anchor="middle">${tg.t}</text></g>`);
      x = left ? x - w - 3 : x + w + 3;
    }
  }
  const W = 70 + BW + 70 + 70;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-70 0 ${W + 70} ${h + 32}" class="pinout">
  <rect x="-70" y="0" width="${W + 70}" height="${h + 32}" fill="#F8FAFC"/>${svg}${tags.join('')}</svg>`;
}

export function pinTags(p) {
  if (p.t !== 'io') return [];
  if (p.alias) return [{ t: '=' + p.alias, c: '#94A3B8' }];
  if (p.flash) return [{ t: 'FLASH', c: '#DC2626' }];
  if (p.reserved) return [{ t: 'RSVD', c: '#DC2626' }];
  const out = [];
  if (p.caps.includes('adc')) out.push({ t: 'ADC', c: '#16A34A' });
  if (p.caps.includes('pwm') && !p.softpwm) out.push({ t: 'PWM', c: '#7C3AED' });
  if (p.caps.includes('sda') || p.caps.includes('scl')) out.push({ t: p.caps.includes('sda') ? 'SDA' : 'SCL', c: '#0284C7' });
  if (p.caps.includes('tx') || p.caps.includes('rx')) out.push({ t: p.caps.includes('tx') ? 'TX' : 'RX', c: '#CA8A04' });
  if (p.inputOnly) out.push({ t: 'IN', c: '#EA580C' });
  if (p.strap) out.push({ t: 'BOOT', c: '#DC2626' });
  if (p.usb) out.push({ t: 'USB', c: '#DC2626' });
  return out.slice(0, 3);
}

// ---------- Blueprint (block diagram) ----------
const REQ_NAMES = { pwm: 'PWM', dout: 'Digital out', din: 'Digital in', 'din-pu': 'Digital in (pull-up)', dio: 'Data (1-wire)', adc: 'Analog', sda: 'I2C', scl: 'I2C', 'uart-rx': 'UART', 'uart-tx': 'UART' };
export function blueprintSvg(res) {
  const { board: b, parts, wires } = res;
  const W = 360;
  const sources = parts.filter((p) => p.source);
  const boardMods = parts.filter((p) => !p.source && wires.some((w) => w.part === p.id && w.board && w.kind === 'sig'));
  const deep = parts.filter((p) => !p.source && !boardMods.includes(p));
  const rows = [sources, [{ id: '__board', label: b.short, board: true }], boardMods, deep].filter((r) => r.length);
  const pos = {};
  const BH = 46, gapY = 66;
  rows.forEach((row, ri) => {
    const n = row.length;
    const bw = Math.min(150, (W - 20) / n - 10);
    row.forEach((p, i) => {
      const x = 10 + (i + 0.5) * ((W - 20) / n) - bw / 2;
      pos[p.id] = { x, y: 14 + ri * (BH + gapY), w: bw, h: BH, p };
    });
  });
  const edges = [];
  // sources
  for (const s of sources) {
    const tos = new Set();
    for (const w of wires) if (w.part === s.id) { if (w.board) tos.add('__board'); if (w.bPart) tos.add(w.bPart); }
    if (s.usbOnly) tos.add('__board');
    for (const t of tos) edges.push({ a: s.id, b: t, label: s.usbOnly ? 'USB' : (SOURCES[s.sourceKey].v + ' V'), kind: 'pwr' });
  }
  for (const m of boardMods) {
    const sig = wires.filter((w) => w.part === m.id && w.board && w.kind === 'sig');
    const counts = {};
    for (const w of sig) { const n = REQ_NAMES[w.req.split(':')[0]] || w.req; counts[n] = (counts[n] || 0) + 1; }
    const lbl = Object.entries(counts).map(([n, c]) => (n === 'I2C' || n === 'UART' ? n : (c > 1 ? `${n} ×${c}` : n))).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
    edges.push({ a: '__board', b: m.id, label: lbl, kind: 'sig' });
  }
  for (const d of deep) {
    const from = new Set(wires.filter((w) => w.bPart === d.id && !parts.find((p) => p.id === w.part).source).map((w) => w.part));
    for (const f of from) edges.push({ a: f, b: d.id, label: 'power out', kind: 'pwr' });
  }
  for (const w of wires) if (w.kind === 'feed' && !sources.find((s) => s.id === w.part)) edges.push({ a: w.part, b: '__board', label: '5 V', kind: 'pwr' });

  const H = 14 + rows.length * (BH + gapY) - gapY + 20;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="blueprint">`,
    `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#7DD3FC"/></marker><marker id="arp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#FBBF24"/></marker>
    <pattern id="bpg" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#1E3A5F" stroke-width="0.6"/></pattern></defs>`,
    `<rect width="${W}" height="${H}" fill="#0C2340"/><rect width="${W}" height="${H}" fill="url(#bpg)"/>`];
  for (const e of edges) {
    const A = pos[e.a], B = pos[e.b];
    if (!A || !B) continue;
    let x1 = A.x + A.w / 2, y1 = A.y + A.h, x2 = B.x + B.w / 2, y2 = B.y;
    if (B.y < A.y) { y1 = A.y; y2 = B.y + B.h; }
    if (A.y === B.y) { y1 = A.y + A.h / 2; y2 = B.y + B.h / 2; x1 = A.x + (x2 > x1 ? A.w : 0); x2 = B.x + (x2 > x1 ? 0 : B.w); }
    const my = (y1 + y2) / 2;
    const col = e.kind === 'pwr' ? '#FBBF24' : '#7DD3FC';
    out.push(`<path d="M${x1} ${y1}C${x1} ${my} ${x2} ${my} ${x2} ${y2}" fill="none" stroke="${col}" stroke-width="1.6" marker-end="url(#${e.kind === 'pwr' ? 'arp' : 'ar'})" ${e.kind === 'pwr' ? 'stroke-dasharray="5 3"' : ''}/>`);
    if (e.label) {
      const lx = (x1 + x2) / 2, ly = my;
      const tw = Math.min(e.label.length * 5.4 + 10, 170);
      out.push(`<rect x="${lx - tw / 2}" y="${ly - 8}" width="${tw}" height="15" rx="4" fill="#0C2340" stroke="${col}" stroke-width="0.6"/><text x="${lx}" y="${ly + 3.5}" text-anchor="middle" class="bpe" fill="${col}">${esc(e.label)}</text>`);
    }
  }
  for (const q of Object.values(pos)) {
    const p = q.p;
    const sub = p.board ? b.mcu.split(' (')[0] : p.source ? SOURCES[p.sourceKey].short : p.def.short + (p.def.isLed ? ` (${p.color})` : '');
    out.push(`<g><rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" rx="6" fill="${p.board ? '#123B66' : '#0C2340'}" stroke="${p.board ? '#E0F2FE' : '#7DD3FC'}" stroke-width="${p.board ? 1.8 : 1.1}"/>`);
    out.push(`<text x="${q.x + q.w / 2}" y="${q.y + 19}" text-anchor="middle" class="bpt">${esc(fit(p.board ? b.short : p.label, q.w))}</text><text x="${q.x + q.w / 2}" y="${q.y + 34}" text-anchor="middle" class="bps">${esc(fit(sub, q.w))}</text></g>`);
  }
  out.push('</svg>');
  return out.join('');
}
const fit = (s, w) => { const n = Math.floor((w - 8) / 6); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
void COMPONENTS;
