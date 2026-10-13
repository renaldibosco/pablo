// Pablo's IDE — engine: pin allocation, electrical checks, power budget.
import { COMPONENTS, SOURCES, LED_VF, nextE12 } from './components.js';

const SIG_ORDER = ['sda', 'scl', 'uart', 'adc', 'pwm', 'din-pu', 'dio', 'din', 'dout'];
const SIG_COLORS = ['#3B82F6', '#22C55E', '#EAB308', '#A855F7', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#14B8A6', '#8B5CF6', '#F43F5E', '#0EA5E9'];

const reqBase = (req) => req.split(':')[0];

export function partsFor(project, board, opts = {}) {
  const adv = opts.adv || new Set();
  return project.parts
    .filter((p) => (!p.when || p.when(board)) && (!p.adv || adv.has(p.id)))
    .map((p) => {
      let c = p.c;
      if (c && COMPONENTS[c].alt3v3 && board.logicV < 4) c = COMPONENTS[c].alt3v3;
      const inst = { ...p, c, def: c ? COMPONENTS[c] : null };
      if (p.source) inst.sourceKey = (opts.sources && opts.sources[p.id]) || p.def;
      return inst;
    });
}

function fiveVPin(b) { return b.power.fiveVPin ? b.byName(b.power.fiveVPin) : b.rail('5V'); }
function feedPin(b) { return b.power.boardFeed ? b.byName(b.power.boardFeed) : null; }

// Decide which rail powers a module and at what voltage.
function chooseRail(b, def) {
  const [lo, hi] = def.vcc;
  const ok = (v) => v >= lo - 0.01 && v <= hi + 0.01;
  const vccPin = def.pins.find((p) => p.role === 'vcc');
  const preferLogic = vccPin && vccPin.prefer === 'logic';
  const five = fiveVPin(b);
  const three = b.rail('3V3');
  if (preferLogic && b.logicV < 4 && three && ok(3.3)) return { pin: three, v: 3.3, rail: '3V3' };
  if (five && ok(5)) return { pin: five, v: b.family === 'rp2040' ? 4.8 : 5, rail: '5V' };
  if (three && ok(3.3)) return { pin: three, v: 3.3, rail: '3V3' };
  return { pin: five || three, v: five ? 5 : 3.3, rail: five ? '5V' : '3V3', bad: true };
}

function pinOk(p, req) {
  if (!p || p.t !== 'io' || p.alias || p.flash || p.reserved) return false;
  const c = p.caps;
  switch (req) {
    case 'pwm': return c.includes('pwm') && !p.inputOnly;
    case 'dout': return c.includes('dout') && !p.inputOnly;
    case 'din': return c.includes('din');
    case 'din-pu': return c.includes('din') && !p.noPull;
    case 'dio': return c.includes('din') && c.includes('dout') && !p.inputOnly;
    case 'adc': return c.includes('adc');
    case 'sda': return c.includes('sda');
    case 'scl': return c.includes('scl');
    case 'rx': return c.includes('din') && !p.noInt;
    case 'tx': return c.includes('dout') && !p.inputOnly;
    default: return false;
  }
}

function score(b, p, req, ctx) {
  let s = 0;
  const c = p.caps;
  if (p.usb) s += 100;
  if (p.strap) s += 40;
  if (p.fixedPullup) s += 15;
  if (p.led) s += 8;
  if (p.boot) s += 3;
  if ((c.includes('sda') || c.includes('scl')) && !['sda', 'scl'].includes(req)) s += 12;
  if ((c.includes('tx') || c.includes('rx')) && !['rx', 'tx'].includes(req)) s += 5;
  if (c.includes('adc') && req !== 'adc') s += 6;
  if (c.includes('spi')) s += 2;
  if (c.includes('pwm') && req !== 'pwm') s += p.hwpwm ? 5 : 1;
  if (p.inputOnly && (req === 'din')) s -= 3;
  if (req === 'adc' && p.adc2) s += 4;
  if (req === 'pwm') {
    if (p.hwpwm) s -= 5;
    for (const q of ctx.pwmPins) {
      if (p.pwmSlice !== undefined && q.pwmSlice === p.pwmSlice && q.pwmCh === p.pwmCh) s += 60;
      if (p.hwpwm && q.hwpwm === p.hwpwm) s += 12;
    }
  }
  // keep a module's wires close together on the header
  if (ctx.near.length) {
    const d = Math.min(...ctx.near.map((q) => (q.side === p.side ? Math.abs(q.row - p.row) : 6 + Math.abs(q.row - p.row) * 0.3)));
    s += d * 0.25;
  } else s += p.row * 0.01;
  return s;
}

export function allocate(project, board, opts = {}) {
  const b = board;
  const parts = partsFor(project, b, opts);
  const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
  const overrides = opts.overrides || {};
  const used = new Map(); // pinId -> [wireKey]
  const wires = [];
  const notes = [];
  const ctx = { pwmPins: [] };
  const partPins = {}; // partId -> [board pins used]

  const has = (ref) => byId[ref.split('.')[0]];
  let links = project.links.filter(([a, t, o]) => has(a) && (!t.includes('.') || has(t)) && (!o || !o.when || o.when(b)));

  // Fallbacks: analog sensor on a board without (free) ADC
  const adcPins = b.pins.filter((p) => pinOk(p, 'adc'));
  let adcLeft = adcPins.length;
  links = links.map((l) => {
    if (l[1] === 'adc') {
      if (adcLeft > 0) { adcLeft--; return l; }
      if (l[2] && l[2].alt) {
        notes.push({ part: l[0].split('.')[0], text: b.hasAdc ? 'No free analog pin left — using the module\'s digital output (DO) instead: you get wet/dry (threshold set by the pot), not a percentage.' : `${b.short} has no analog inputs — using the module's digital output (DO): you get wet/dry (threshold set by the pot), not a percentage.` });
        return [l[2].alt[0], l[2].alt[1], { ...l[2], fallback: true }];
      }
    }
    return l;
  });

  const keyOf = (l) => l[0] + '>' + l[1];
  const take = (pin, key) => { if (!used.has(pin.id)) used.set(pin.id, []); used.get(pin.id).push(key); };
  const free = (pin) => !used.has(pin.id);
  const partOf = (ref) => ref.split('.')[0];
  const pinDef = (ref) => { const [pid, pin] = ref.split('.'); const part = byId[pid]; if (!part || !part.def) return { id: pin, role: 'pin' }; return part.def.pins.find((x) => x.id === pin) || { id: pin, role: 'pin' }; };

  const pick = (req, key, partId) => {
    if (overrides[key]) { const p = b.pins.find((x) => x.id === overrides[key]); if (p) return p; }
    const near = partPins[partId] || [];
    const cands = b.pins.filter((p) => pinOk(p, req) && free(p));
    if (!cands.length) return null;
    cands.sort((x, y) => score(b, x, req, { ...ctx, near }) - score(b, y, req, { ...ctx, near }));
    return cands[0];
  };

  const addBoardWire = (l, pin, extra = {}) => {
    const [ref, req, o] = l;
    const key = keyOf(l);
    const w = { key, a: ref, part: partOf(ref), pinDef: pinDef(ref), req, board: pin, note: o && o.note, fallback: o && o.fallback, ...extra };
    wires.push(w);
    if (pin) { take(pin, key); (partPins[w.part] = partPins[w.part] || []).push(pin); if (req === 'pwm') ctx.pwmPins.push(pin); }
    return w;
  };

  // 1) I2C (shared bus — fixed pins)
  for (const l of links.filter((l) => l[1] === 'sda' || l[1] === 'scl')) {
    const name = b.i2c[l[1]];
    const key = keyOf(l);
    const pin = overrides[key] ? b.pins.find((x) => x.id === overrides[key]) : b.byName(name);
    addBoardWire(l, pin, { kind: 'sig' });
  }
  // 2) UART groups
  const groups = {};
  for (const l of links.filter((l) => l[1].startsWith('uart-'))) { const g = l[1].split(':')[1]; (groups[g] = groups[g] || []).push(l); }
  for (const g of Object.values(groups)) {
    const u = (b.uart || [])[0];
    const rxL = g.find((l) => l[1].startsWith('uart-rx'));
    const txL = g.find((l) => l[1].startsWith('uart-tx'));
    if (!u) { for (const l of g) addBoardWire(l, null, { kind: 'sig', fail: 'No serial port available' }); continue; }
    if (u.soft) {
      if (rxL) addBoardWire(rxL, pick('rx', keyOf(rxL), partOf(rxL[0])), { kind: 'sig', uart: u.name, soft: true });
      if (txL) addBoardWire(txL, pick('tx', keyOf(txL), partOf(txL[0])), { kind: 'sig', uart: u.name, soft: true });
    } else {
      if (rxL) addBoardWire(rxL, overrides[keyOf(rxL)] ? b.pins.find((x) => x.id === overrides[keyOf(rxL)]) : b.byName(u.rx), { kind: 'sig', uart: u.name });
      if (txL) addBoardWire(txL, overrides[keyOf(txL)] ? b.pins.find((x) => x.id === overrides[keyOf(txL)]) : b.byName(u.tx), { kind: 'sig', uart: u.name });
    }
  }
  // 3) other signals, most constrained first
  const sigLinks = links.filter((l) => !l[1].includes('.') && SIG_ORDER.includes(reqBase(l[1])) && !['sda', 'scl'].includes(l[1]) && !l[1].startsWith('uart'));
  sigLinks.sort((x, y) => SIG_ORDER.indexOf(reqBase(x[1])) - SIG_ORDER.indexOf(reqBase(y[1])));
  // keep project order within the same requirement (so IN1..IN4 land in order)
  for (const l of sigLinks) {
    const pin = pick(reqBase(l[1]), keyOf(l), partOf(l[0]));
    addBoardWire(l, pin, { kind: 'sig', fail: pin ? null : `No free pin that can do ${l[1].toUpperCase()}` });
  }
  // 4) power, ground, feed
  const gndPins = b.pins.filter((p) => p.t === 'gnd' && p.n === 'GND');
  let gi = 0;
  for (const l of links.filter((l) => ['GND', 'VCC', 'FEED'].includes(l[1]))) {
    const part = byId[partOf(l[0])];
    if (l[1] === 'GND') {
      // nearest GND to the module's signal pins, spreading load over GND pins
      const near = partPins[part.id] || [];
      let g;
      if (near.length) {
        const side = near[0].side;
        const cands = gndPins.filter((p) => p.side === side);
        g = (cands.length ? cands : gndPins).slice().sort((x, y) => (used.get(x.id)?.length || 0) - (used.get(y.id)?.length || 0) || Math.abs(x.row - near[0].row) - Math.abs(y.row - near[0].row))[0];
      } else g = gndPins.slice().sort((x, y) => (used.get(x.id)?.length || 0) - (used.get(y.id)?.length || 0))[gi++ % 1];
      addBoardWire(l, g, { kind: 'gnd' });
    } else if (l[1] === 'VCC') {
      const r = chooseRail(b, part.def);
      // use the matching power pin closest to this module's signal wires
      const near = partPins[part.id] || [];
      if (near.length && !b.power.fiveVPin) {
        const same = b.pins.filter((p) => p.t === 'pwr' && p.rail === r.pin.rail && p.n === r.pin.n);
        same.sort((x, y) => (x.side === near[0].side ? 0 : 100) + Math.abs(x.row - near[0].row) + (used.get(x.id)?.length || 0) * 3 - ((y.side === near[0].side ? 0 : 100) + Math.abs(y.row - near[0].row) + (used.get(y.id)?.length || 0) * 3));
        if (same.length) r.pin = same[0];
      }
      addBoardWire(l, r.pin, { kind: r.rail === '5V' ? '5v' : '3v3', railV: r.v, rail: r.rail, railBad: r.bad });
      part.vccV = r.v; part.rail = r.rail;
    } else {
      const fp = feedPin(b);
      addBoardWire(l, fp, { kind: 'feed', fail: fp ? null : 'This board is powered from its own USB-C supply' });
    }
  }
  // 5) module-to-module wires
  for (const l of links.filter((l) => l[1].includes('.'))) {
    const [a, c, o] = l;
    const aId = pinDef(a).id, cId = pinDef(c).id;
    let kind = 'aux';
    if (/^\+$|12V/.test(aId) || /^\+$|12V/.test(cId) || /^5V$/.test(aId)) kind = 'auxpos';
    if (/^-$|GND|DC-/.test(aId) || /^-$|GND/.test(cId)) kind = 'auxneg';
    wires.push({ key: keyOf(l), a, part: partOf(a), pinDef: pinDef(a), b: c, bPart: partOf(c), bPinDef: pinDef(c), kind, note: o && o.note });
  }

  // Level fixes: add dividers / level shifters where a module and the board disagree on voltage
  for (const w of wires) {
    if (w.kind !== 'sig' || !w.board) continue;
    const lv = levels(b, byId[w.part], w.pinDef);
    if (lv.tooHighIn) {
      if (w.pinDef.i2c) w.shifter = { lv: b.logicV, hv: lv.outV };
      else w.divider = { dir: 'in', vin: lv.outV, vout: +(lv.outV * 2 / 3).toFixed(2) };
    } else if (lv.tooHighOut && w.pinDef.dir === 'in') {
      w.divider = { dir: 'out', vin: b.logicV, vout: +(b.logicV * 2 / 3).toFixed(2) };
    }
  }

  // LEDs: pick a real resistor for this board's logic level
  for (const part of parts) {
    if (part.def && part.def.isLed) {
      const vf = LED_VF[part.color || 'red'];
      const target = Math.min(10, b.pinRec);
      const head = b.logicV - vf;
      const r = head > 0.05 ? nextE12(head / (target / 1000)) : null;
      part.vf = vf; part.res = r;
      part.mA = r ? +(head / r * 1000).toFixed(1) : 0;
    }
  }
  // give each signal wire a colour
  let ci = 0;
  for (const w of wires) if (w.kind === 'sig' || w.kind === 'aux') w.color = SIG_COLORS[ci++ % SIG_COLORS.length];
  for (const w of wires) {
    if (w.kind === 'gnd' || w.kind === 'auxneg') w.color = '#111827';
    if (w.kind === '5v' || w.kind === 'feed' || w.kind === 'auxpos') w.color = '#DC2626';
    if (w.kind === '3v3') w.color = '#F59E0B';
  }
  return { project, board: b, parts, byId, wires, used, notes, opts };
}

// Voltage relationship between a board pin and a module pin
export function levels(b, part, pd) {
  const def = part.def;
  const vcc = part.vccV || (def && def.vcc ? (def.vcc[0] > 3.6 ? 5 : b.logicV) : b.logicV);
  const r = { vcc };
  if (pd.dir === 'out' || pd.dir === 'io') {
    r.outV = pd.outV === 'vcc' ? vcc : pd.outV;
    r.tooHighIn = r.outV !== undefined && r.outV > b.logicV + 0.3 && !b.fiveVTolerant;
  }
  if (pd.dir === 'in' || pd.dir === 'io') {
    r.inMax = pd.inMax === 'vcc' ? vcc : pd.inMax;
    r.tooHighOut = r.inMax !== undefined && b.logicV > r.inMax + 0.3;
  }
  return r;
}

const fmtV = (v) => (Math.round(v * 10) / 10) + ' V';

export function check(res) {
  const { board: b, wires, byId, parts } = res;
  const issues = [];
  const add = (level, title, detail, fix, keys = []) => issues.push({ level, title, detail, fix, keys });
  const canon = (p) => (p.alias ? b.byName(p.alias) : p);

  // failed allocations
  for (const w of wires) if (w.fail) add('error', `${label(res, w.part)}: ${w.pinDef.id} not connected`, w.fail, 'Try a board with more pins, or turn off an advanced part.', [w.key]);

  // pin conflicts
  const byPin = new Map();
  for (const w of wires) if (w.board) { const p = canon(w.board); if (!byPin.has(p.id)) byPin.set(p.id, []); byPin.get(p.id).push(w); }
  for (const [pid, ws] of byPin) {
    const p = b.pins.find((x) => x.id === pid);
    if (p.t !== 'io') continue;
    const kinds = new Set(ws.map((w) => w.req));
    const i2cShared = ws.every((w) => w.req === 'sda') || ws.every((w) => w.req === 'scl');
    if (ws.length > 1 && !i2cShared) add('error', `Pin conflict on ${p.n}`, `${ws.map((w) => label(res, w.part) + ' ' + w.pinDef.id).join(' and ')} are both wired to ${p.n}.`, 'Move one of them to a free pin (tap the wire in the Pins tab).', ws.map((w) => w.key));
    if (ws.length > 1 && i2cShared) {
      const addrs = ws.map((w) => byId[w.part].def.i2cAddr).filter(Boolean);
      const dup = addrs.find((a, i) => addrs.indexOf(a) !== i);
      if (dup) add('error', `I2C address clash (${dup})`, 'Two devices on the same I2C bus use the same address.', 'Change the address jumper on one module.', ws.map((w) => w.key));
    }
    void kinds;
  }

  // per-wire checks
  const ioTotal = { mA: 0 };
  for (const w of wires) {
    if (!w.board || w.kind !== 'sig') continue;
    const p = canon(w.board);
    const part = byId[w.part];
    const def = part.def;
    const pd = w.pinDef;
    const where = `${label(res, w.part)} ${pd.id} → ${p.n}`;
    if (p.flash) add('error', `${p.n} is a flash pin`, `${where}: this pin is wired to the board's internal flash chip. Using it crashes the board.`, 'Move this wire to another pin.', [w.key]);
    if (p.reserved) add('error', `${p.n} is reserved`, `${where}: ${p.note}`, 'Move this wire to another pin.', [w.key]);
    const need = reqBase(w.req) === 'uart-rx' ? 'rx' : reqBase(w.req) === 'uart-tx' ? 'tx' : reqBase(w.req);
    if (!p.flash && !p.reserved && p.t === 'io' && !pinOk(p, need) && !w.fail) {
      let why = `${p.n} can't do ${need.toUpperCase()}.`;
      if (p.inputOnly && ['dout', 'pwm', 'tx', 'dio'].includes(need)) why = `${p.n} is INPUT-ONLY — it cannot drive ${label(res, w.part)}.`;
      if (need === 'din-pu' && p.noPull) why = `${p.n} has no internal pull-up, so the button input will float.`;
      if (need === 'adc') why = `${p.n} is not an analog pin.`;
      add('error', `Wrong pin type: ${p.n}`, `${where}. ${why}`, 'Pick a pin that supports it (Pins tab shows what each pin can do).', [w.key]);
    }
    if (p.usb) add('warn', `${p.n} is shared with USB`, `${where}: uploading code and Serial Monitor use this pin.`, 'Use another pin, or unplug this wire while uploading.', [w.key]);
    if (p.strap) add('warn', `${p.n} is a boot (strapping) pin`, `${where}: ${p.strap}`, 'Usually OK for outputs, but if the board won\'t boot or upload, move this wire.', [w.key]);
    if (p.led && !p.strap) add('info', `${p.n} drives the onboard LED`, `${where}: the board's LED will blink with this signal.`, null, [w.key]);
    if (p.fixedPullup && !['sda', 'scl'].includes(w.req)) add('warn', `${p.n} has a fixed 1.8k pull-up`, `${where}: the pin always reads HIGH when nothing pulls it LOW.`, 'Move to another GPIO unless that is what you want.', [w.key]);

    // voltages (dividers / shifters are added automatically by allocate())
    const lv = levels(b, part, pd);
    const vcc = lv.vcc;
    if (lv.tooHighIn) {
      if (w.shifter) add('info', 'I2C level shifter added', `${label(res, w.part)} pulls SDA/SCL up to ${fmtV(lv.outV)}; ${b.short} pins are 3.3 V only, so the wiring goes through a 4-channel BSS138 level shifter.`, `Shifter LV → ${b.short} 3.3 V, HV → 5 V, GND → GND. Board ${p.n} → LV side, module ${pd.id} → HV side.`, [w.key]);
      else if (w.divider) add('info', `Voltage divider on ${pd.id}`, `${def.short} ${pd.id} outputs ${fmtV(lv.outV)}; ${b.short} pins are 3.3 V only. A divider brings it down to ~${fmtV(w.divider.vout)}.`, `${pd.id} → 1 kΩ → ${p.n}, and ${p.n} → 2 kΩ → GND (2 kΩ = two 1 kΩ in series, or 2.2 kΩ).`, [w.key]);
      else add('error', `${fmtV(lv.outV)} signal into a 3.3 V pin`, `${where}: ${def.short} ${pd.id} outputs ${fmtV(lv.outV)} — ${b.short} pins are NOT 5 V tolerant and can be damaged.`, `Add a voltage divider: ${pd.id} → 1 kΩ → ${p.n}, and ${p.n} → 2 kΩ → GND.`, [w.key]);
    }
    if (pd.dir === 'in' || pd.dir === 'io') {
      if (lv.tooHighOut) {
        if (w.divider) add('info', `Voltage divider on ${pd.id}`, `${def.short} ${pd.id} only accepts ${lv.inMax} V; ${b.short} outputs ${b.logicV} V. A divider brings it to ~${fmtV(w.divider.vout)}.`, `${p.n} → 1 kΩ → ${pd.id}, and ${pd.id} → 2 kΩ → GND.`, [w.key]);
        else add('error', `${b.logicV} V signal into a ${lv.inMax} V pin`, `${where}: ${def.short} ${pd.id} only accepts ${lv.inMax} V.`, `Add a voltage divider: ${p.n} → 1 kΩ → ${pd.id}, and ${pd.id} → 2 kΩ → GND.`, [w.key]);
      }
      if (pd.vih === 'relay' && b.logicV < 4.5) add('warn', '3.3 V may not switch a 5 V relay module', `${where}: these modules are active-LOW. A 3.3 V HIGH may not switch the opto fully OFF, so the relay can stay ON.`, 'Use a relay module with a 3.3 V / high-level trigger jumper, or drive IN with an NPN transistor (2N2222 + 1 kΩ).', [w.key]);
      else if (typeof pd.vih === 'number') {
        const vih = pd.vihRel ? pd.vih * vcc : pd.vih;
        if (b.logicV < vih) add('warn', 'Signal too low', `${where}: needs ≥ ${fmtV(vih)} for HIGH, board gives ${b.logicV} V.`, 'Use a level shifter.', [w.key]);
      }
    }
    if (pd.pull && p.noPull) add('error', `${p.n} has no internal pull-up`, `${where}`, 'Add a 10 kΩ resistor from the pin to 3.3 V, or use another pin.', [w.key]);
    if (def && def.isLed) ioTotal.mA += part.mA;
    else ioTotal.mA += 1;
  }

  // Pico PWM slices
  if (b.family === 'rp2040') {
    const pw = wires.filter((w) => w.req === 'pwm' && w.board);
    for (let i = 0; i < pw.length; i++) for (let j = i + 1; j < pw.length; j++) {
      const p = pw[i].board, q = pw[j].board;
      if (p.pwmSlice === q.pwmSlice && p.pwmCh === q.pwmCh) add('error', `${p.n} and ${q.n} share PWM ${p.pwmSlice}${p.pwmCh}`, 'They will always output the same duty cycle.', 'Move one to a different PWM slice/channel.', [pw[i].key, pw[j].key]);
    }
  }
  if (b.family === 'rpi') {
    const pw = wires.filter((w) => w.req === 'pwm' && w.board);
    const soft = pw.filter((w) => !w.board.hwpwm);
    if (soft.length) add('info', 'Software PWM', `${soft.map((w) => w.board.n).join(', ')} use software PWM (gpiozero). Fine for motors/LEDs; use GPIO12/13/18/19 for jitter-free servo control.`, null, soft.map((w) => w.key));
  }

  // LEDs
  for (const part of parts) if (part.def && part.def.isLed) {
    if (!part.res) add('error', `${label(res, part.id)} can't light`, `${part.color} LED needs ~${part.vf} V but the pin only gives ${b.logicV} V.`, 'Use a red/yellow/green LED or drive it from 5 V with a transistor.', []);
    else if (b.logicV - part.vf < 0.5) add('info', `${label(res, part.id)} will be dimmer`, `${part.color} LEDs need ~${part.vf} V; only ${(b.logicV - part.vf).toFixed(1)} V is left for the resistor (${part.res} Ω → ~${part.mA} mA). Brightness varies between LEDs.`, null, []);
  }
  if (ioTotal.mA > b.totalIO) add('warn', 'Too much total pin current', `Signal pins supply ~${Math.round(ioTotal.mA)} mA in total; ${b.short} allows ~${b.totalIO} mA.`, 'Drive LEDs through transistors.', []);

  // VCC choices
  for (const w of wires) if (w.railBad) { const part = byId[w.part]; add('error', `${part.def.short} needs ${part.def.vcc[0]}–${part.def.vcc[1]} V`, `${b.short} has no suitable supply pin.`, 'Power the module from an external regulator (common GND).', [w.key]); }

  // sharing rail/GND header pins
  const railUse = {};
  for (const w of wires) if (w.board && ['gnd', '5v', '3v3'].includes(w.kind)) { const k = w.board.n; railUse[k] = (railUse[k] || 0) + 1; }
  const crowded = Object.entries(railUse).filter(([n, c]) => c > b.pins.filter((p) => p.n === n).length);
  if (crowded.length) add('info', 'Use a breadboard power rail', `${crowded.map(([n, c]) => `${c} wires go to ${n}`).join(', ')}. A header pin only takes one jumper — run one wire from the board to the breadboard rail, then branch from there.`, null, []);

  // board-specific notes
  if (wires.some((w) => w.soft)) add('info', 'Uses SoftwareSerial', `${b.short} has only one hardware serial port and it is used by USB, so Bluetooth runs on SoftwareSerial at 9600 baud.`, null, wires.filter((w) => w.soft).map((w) => w.key));
  if (b.family === 'rp2040' && wires.some((w) => w.board && w.board.n === 'VSYS' && w.kind === '5v')) add('info', 'VSYS is the 5 V node', 'On USB, VSYS ≈ 4.7 V (after the protection diode). 5 V modules work fine on it.', null, []);
  if (wires.some((w) => w.kind === 'feed')) add('info', 'Two power sources', 'The board is powered from the project battery. Switch the battery OFF before plugging in USB to upload code.', null, wires.filter((w) => w.kind === 'feed').map((w) => w.key));

  const order = { error: 0, warn: 1, info: 2 };
  issues.sort((x, y) => order[x.level] - order[y.level]);
  return issues;
}

export function label(res, partId) { const p = res.byId[partId]; return p ? p.label : partId; }

// ---------------- Power budget ----------------
export function power(res) {
  const { board: b, parts, wires, byId } = res;
  const issues = [];
  const add = (level, title, detail, fix) => issues.push({ level, title, detail, fix });
  const groups = [];

  const rails = { '5V': [], '3V3': [] };
  for (const part of parts) {
    if (!part.def || part.def.motor) continue;
    if (part.def.isLed) { rails[b.logicV > 4 ? '5V' : '3V3'].push({ name: `${part.label} (${part.color} LED, ${part.res || '—'} Ω)`, avg: part.mA, peak: part.mA }); continue; }
    if (part.def.vcc && part.rail) rails[part.rail].push({ name: part.label + ' · ' + part.def.short, avg: part.def.mA.avg, peak: part.def.mA.peak });
  }
  const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
  const railRows = Object.entries(rails).map(([rail, loads]) => ({ rail, loads, avg: sum(loads, 'avg'), peak: sum(loads, 'peak'), max: b.power.railMax[rail], note: b.power.railNote[rail] }));
  for (const r of railRows) {
    if (!r.loads.length) continue;
    if (r.peak > r.max) add('error', `${r.rail} rail overloaded`, `Modules on ${r.rail} draw up to ${Math.round(r.peak)} mA; budget is ${r.max} mA.`, 'Power the heavy modules from a separate 5 V supply (shared GND).');
    else if (r.peak > r.max * 0.8) add('warn', `${r.rail} rail near its limit`, `${Math.round(r.peak)} of ${r.max} mA.`, null);
  }
  const boardLoad = { name: `${b.name} itself`, avg: b.power.draw.avg, peak: b.power.draw.peak };
  const logicLoads = [boardLoad, ...railRows.flatMap((r) => r.loads)];

  // which source powers the board?
  const sourceParts = parts.filter((p) => p.source);
  const usbSup = sourceParts.find((p) => p.usbOnly);
  const feedWire = wires.find((w) => w.kind === 'feed');

  for (const sp of sourceParts) {
    const src = SOURCES[sp.sourceKey];
    const loads = [];
    const g = { part: sp, src, loads, label: sp.label };
    // loads hanging off this source
    const fromSrc = wires.filter((w) => w.part === sp.id && w.b);
    const driverWire = fromSrc.find((w) => byId[w.bPart] && byId[w.bPart].def && byId[w.bPart].c === 'l298n' && w.bPinDef.id === '12V');
    const relayWire = fromSrc.find((w) => byId[w.bPart] && byId[w.bPart].c.startsWith('relay1'));
    const motorsOf = (partIds) => parts.filter((p) => p.def && p.def.motor && partIds.includes(p.id));
    if (driverWire) {
      const drv = byId[driverWire.bPart];
      const motorIds = wires.filter((w) => w.part === drv.id && w.bPart && byId[w.bPart].def && byId[w.bPart].def.motor).map((w) => w.bPart);
      const ms = motorsOf([...new Set(motorIds)]);
      loads.push({ name: 'L298N logic', avg: drv.def.logicmA, peak: drv.def.logicmA });
      for (const m of ms) loads.push({ name: m.label, avg: m.def.motor.run, peak: m.def.motor.stall, motor: true });
      const vMot = src.v - drv.def.drop;
      g.motorV = vMot;
      const m0 = ms[0] && ms[0].def.motor;
      if (m0) {
        if (vMot < m0.vmin) add('error', 'Motors get too little voltage', `${src.short} (${src.v} V) − L298N drop (~${drv.def.drop} V) = ~${fmtV(vMot)} at the motors; they need ≥ ${m0.vmin} V.`, 'Use 2× 18650 (7.4 V).');
        else if (vMot < m0.vmin + 1) add('warn', 'Motors will be weak', `Only ~${fmtV(vMot)} reaches the motors after the L298N drop, and it sags further under load.`, 'Use 2× 18650 (7.4 V) for proper speed.');
        if (src.v - drv.def.drop > m0.vmax + 0.6) add('warn', 'Motors over-volted', `~${fmtV(src.v - drv.def.drop)} at the motors, rated ${m0.vmax} V max. They run hot and wear faster.`, 'Limit PWM to ~80 % in code, or use a lower-voltage pack.');
      }
      if (src.v > drv.def.vsRegMax) add('warn', 'Remove the L298N 5V-EN jumper', `Above ${drv.def.vsRegMax} V the onboard regulator overheats.`, null);
      // L298N regulator feeding the board
      const drvFeed = wires.find((w) => w.kind === 'feed' && w.part === drv.id);
      if (drvFeed) {
        const regLoad = sum(logicLoads, 'peak');
        loads.push(...logicLoads.map((l) => ({ ...l, via: 'L298N 5 V' })));
        g.reg = { load: regLoad, max: drv.def.regOut };
        if (regLoad > drv.def.regOut) add('error', 'L298N 5 V regulator overloaded', `Board + modules peak at ${Math.round(regLoad)} mA; the 78M05 gives ~${drv.def.regOut} mA.`, 'Use a separate buck converter (e.g. LM2596 / MP1584 set to 5 V).');
        if (src.v < 7) add('error', 'L298N 5 V output will sag', `The 78M05 regulator needs ~7 V in to give a clean 5 V. ${src.short} is only ${src.v} V, so the board gets ~${fmtV(src.v - 2)}${b.family === 'esp32' || b.family === 'esp8266' ? ' and the Wi-Fi/Bluetooth chip will brown-out and reset' : ''}.`, 'Use 2× 18650 (7.4 V), or power the board from a separate 5 V supply.');
        else if (src.vEmpty < 7) add('info', 'Recharge before the cells run flat', `The 78M05 needs ~7 V in. ${src.short} drops to ~${src.vEmpty} V when flat, and below ~7 V the board's supply starts to sag.`, null);
      }
    }
    if (relayWire) {
      const relay = byId[relayWire.bPart];
      const pumpIds = wires.filter((w) => w.part === relay.id && w.bPart).map((w) => w.bPart);
      for (const m of motorsOf(pumpIds)) {
        loads.push({ name: m.label, avg: m.def.motor.run, peak: m.def.motor.stall, motor: true });
        if (src.v > m.def.motor.vmax + 0.5) add('warn', 'Pump over-volted', `${src.short} gives ${src.v} V; pump is rated ${m.def.motor.vmax} V.`, null);
      }
    }
    // battery straight into Arduino VIN
    if (feedWire && feedWire.part === sp.id) {
      loads.push(...logicLoads.map((l) => ({ ...l, via: 'board regulator' })));
      const inp = b.power.inputs.find((i) => i.pin === b.power.boardFeed);
      if (inp) {
        if (src.v < inp.range[0]) add('warn', `${src.short} is below the ${b.short}'s VIN range`, `VIN wants ${inp.range[0]}–${inp.range[1]} V; ${src.short} gives ${src.v} V, so the 5 V rail will sag (unstable resets, wrong sensor readings).`, 'Use 2× 18650 (7.4 V) or a 9 V supply for the board.');
        else if (src.vEmpty < inp.range[0]) add('info', 'Board voltage drops as the battery drains', `${src.short} falls to ~${src.vEmpty} V when flat, below VIN's ${inp.range[0]} V. Recharge when the car slows down.`, null);
      }
    }
    if (sp === usbSup || (sp.usbOnly && !usbSup)) {
      loads.push(...logicLoads);
      if (b.family === 'rpi') {
        // Pi needs its own spec'd supply
        if (b.id === 'pi5' && src.maxmA < 5000) add('info', 'Pi 5 on a 3 A supply', 'The Pi 5 boots on 3 A but limits its USB ports to 600 mA total.', 'Use the official 27 W (5 A) supply for heavy USB loads.');
      }
    }
    g.avg = sum(loads, 'avg'); g.peak = sum(loads, 'peak');
    g.max = src.maxmA;
    const startup = g.peak;
    if (startup > src.maxmA) add(loads.some((l) => l.motor) && g.avg <= src.maxmA ? 'warn' : 'error', `${src.short} can't supply the peak current`, `Peak (motor start / stall) ~${Math.round(startup)} mA vs ~${src.maxmA} mA the ${src.short} can deliver.`, loads.some((l) => l.motor) ? 'Use 2× 18650 cells; ramp motor speed up in code instead of jumping to 100 %.' : 'Use a bigger supply.');
    if (src.mAh) g.hours = (src.mAh * 0.8) / Math.max(g.avg, 1);
    groups.push(g);
  }
  return { groups, rails: railRows, issues };
}
