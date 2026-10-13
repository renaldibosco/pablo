import { BOARDS } from '../www/js/boards.js';
import { PROJECTS } from '../www/js/projects.js';
import { allocate, check, power } from '../www/js/engine.js';
const verbose = process.argv[2];
for (const p of PROJECTS) for (const b of BOARDS) for (const advOn of [false, true]) {
  const adv = new Set(advOn ? p.parts.filter(x=>x.adv).map(x=>x.id) : []);
  const r = allocate(p, b, { adv });
  const iss = check(r); const pw = power(r);
  const all = [...iss, ...pw.issues];
  const e = all.filter(i=>i.level==='error'), w = all.filter(i=>i.level==='warn');
  const pins = r.wires.filter(x=>x.board && x.kind==='sig').map(x=>`${x.part}.${x.pinDef.id}=${x.board.n}`).join(' ');
  console.log(`${p.id.padEnd(9)} ${b.id.padEnd(9)} adv=${advOn?1:0} E${e.length} W${w.length} | ${pins}`);
  if (verbose) for (const i of all.filter(i=>i.level!=='info')) console.log('    ', i.level, '-', i.title, '|', i.detail);
}
