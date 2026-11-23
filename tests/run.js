/* Uji cepat: node tests/run.js */
globalThis.TKData = require('../js/data.js');
globalThis.TKCalc = require('../js/calc.js');
require('../js/modules.js');
const C = globalThis.TKCalc, { M } = globalThis.TKModules;
let fail = 0;
const near = (a, b, tol, msg) => { const ok = Math.abs(a - b) <= tol; if (!ok) fail++; console.log((ok ? 'ok  ' : 'FAIL') + ' ' + msg + ` (dapat ${a}, harap ${b})`); };

// Table 4.1 cross-check: S & St dihitung dari Y,T
near(C.stress653(30000, 55000, true).S, 23600, 0, 'A283-C S lower');
near(C.stress653(30000, 55000, false).St, 27000, 0, 'A283-C St upper');
near(C.stress653(36000, 58000, true).S, 24900, 0, 'A36 S lower');
near(C.stress653(60000, 80000, false).S, 37800, 0, 'A537-2 S upper');
near(C.stress653(38000, 70000, false).St, 34200, 0, 'A516-70 St upper');
// tmin 4.3.3.1: D=100ft, H=40ft, G=1, S=23600, E=1 → 2.6*39*100/23600 = 0.4297
near(C.tmin653({ Dft: 100, Hft: 40, G: 1, S: 23600, E: 1 }).tmin, 0.42966, 1e-4, 'tmin 653');
// 650 1-foot: D=30, H=14.4, G=0.9, Sd=160 → 4.9*30*14.1*0.9/160 = 11.659 (+CA)
near(C.oneFoot650({ D: 30, H: 14.4, G: 0.9, Sd: 160, St: 171, CA: 0 }).td, 11.659, 1e-3, '650 td');
// cone roof vs rumus lama D/(4.8 sinθ)·√(T/2.2): D=30, θ=9.5°, B=2.2 kPa, E=200000 → ~37.9 mm
near(C.coneRoof650({ D: 30, thetaDeg: 9.5, B: 2.2, U: 2.2, E: 200000, CA: 0 }).tB, 30 / (4.8 * Math.sin(9.5 * Math.PI / 180)), 0.4, 'cone roof (vs rumus lama, selisih <1%)');
// Cosine fit sempurna
const th = [...Array(12)].map((_, i) => 2 * Math.PI * i / 12);
const y = th.map(t => 5 + 20 * Math.cos(t + 0.4));
const fit = C.cosineFit(th, y);
near(fit.R2, 1, 1e-9, 'cosine R2'); near(fit.b, 20, 1e-9, 'cosine b'); near(fit.c, 0.4, 1e-9, 'cosine c');
// Bulge 0.37R: R=10 ft → 3.7 in
near(C.bulge(3.048).BBin, 3.7, 1e-6, 'bulge');
// Edge curve titik akhir
near(C.edgeAllow(TKData.edgeBew, 160, 6).B, 6.9, 1e-9, 'Bew 160 @6');
near(C.edgeAllow(TKData.edgeBe, 20, 1).B, 2.0, 1e-9, 'Be 20 @1');
// Annular 653
near(C.annular653({ tShell: 0.8, stress: 25000 }).step, 0.22, 0, 'annular 653 step');
// MRT
near(C.mrt653({ RTbc: 6.2, RTip: 6, StPr: 0.08, UPr: 0.09, Or: 10 }).MRT, 4.3, 1e-9, 'MRT');
// Semua modul berjalan dengan data contoh
const app = {};
M.forEach(m => {
  const v = {}; (m.fields || []).forEach(fd => { v[fd.k] = fd.type === 'sel' ? fd.opts[fd.def].v : fd.def === '' ? NaN : fd.def; });
  const rows = m.table ? m.table.rows.map(r => { const o = {}; m.table.cols.forEach(c => { const x = r[c.k]; o[c.k] = c.type === 'sel' ? c.opts[x ?? c.def].v : c.type === 'text' ? x : (x === '' || x == null ? NaN : +x); }); return o; }) : [];
  try {
    const out = m.compute(v, rows);
    const st = out.checks.some(c => c.ok === false) ? 'NG' : out.checks.some(c => c.ok === 'warn') ? 'Cek' : 'OK';
    console.log('ok   ' + m.id.padEnd(6) + st.padEnd(4) + m.title);
  } catch (e) { fail++; console.log('FAIL ' + m.id + ' ' + e.stack); }
});
console.log(fail ? `\n${fail} gagal` : '\nSemua uji lulus');
process.exit(fail ? 1 : 0);
