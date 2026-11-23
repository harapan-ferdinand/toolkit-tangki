/* Toolkit Tangki — mesin perhitungan (fungsi murni, tanpa DOM).
 * Input SI (m, mm, MPa) kecuali disebut lain; rumus API 653 dihitung dalam USC lalu
 * dikonversi balik. Setiap fungsi mengembalikan objek angka agar mudah diuji.
 */
(function (root) {
  const DATA = root.TKData || (typeof require !== 'undefined' ? require('./data.js') : {});
  const C = {};
  const MM_PER_IN = 25.4, M_PER_FT = 0.3048, PSI_PER_MPA = 145.0377;
  C.U = { MM_PER_IN, M_PER_FT, PSI_PER_MPA };
  const ft = m => m / M_PER_FT;
  const inch = mm => mm / MM_PER_IN;
  const mm = i => i * MM_PER_IN;
  C.ft = ft; C.inch = inch; C.mm = mm;
  const r100 = x => Math.round(x / 100) * 100;

  /* ---------- Material & tegangan izin API 653 4.3.3.1 / 4.3.3.2 ---------- */
  C.stress653 = function (Y, T, lowerTwo) {
    const Tc = Math.min(T, 80000);
    return lowerTwo
      ? { S: r100(Math.min(0.80 * Y, 0.429 * Tc)), St: r100(Math.min(0.88 * Y, 0.472 * Tc)) }
      : { S: r100(Math.min(0.88 * Y, 0.472 * Tc)), St: r100(Math.min(0.90 * Y, 0.519 * Tc)) };
  };

  /* tmin API 653 4.3.3.1. Dft, Hft, S psi. whole=true → (H−1). Hasil inch. */
  C.tmin653 = function ({ Dft, Hft, G, S, E, whole = true }) {
    const h = whole ? Math.max(Hft - 1, 0) : Math.max(Hft, 0);
    const t = 2.6 * h * Dft * G / (S * E);
    return { raw: t, tmin: Math.max(t, 0.1), floored: t < 0.1 };
  };

  /* Ht API 653 4.3.3.2 (ft, dari dasar course / dasar L) */
  C.ht653 = function ({ St, E, t, Dft, whole = true }) {
    return St * E * t / (2.6 * Dft) + (whole ? 1 : 0);
  };

  /* Evaluasi seluruh shell course (API 653 4.3.3.1 a, 4.3.3.2 a, 6.3.2, 6.3.3) */
  C.shellCourses653 = function ({ D, HL, G, courses, riveted }) {
    const Dft = ft(D);
    let z = 0; // elevasi dasar course (m)
    const rows = [];
    let testLimit = Infinity;
    courses.forEach((c, i) => {
      const lower = i < 2;
      let S, St;
      if (riveted) { S = 21000; St = 21000; }
      else if (c.Y && c.T) ({ S, St } = C.stress653(c.Y, c.T, lower));
      const H = HL - z; // m
      const E = c.E || 1;
      const tm = C.tmin653({ Dft, Hft: ft(H), G, S, E, whole: true });
      const tAct = inch(c.tAct);
      const ok = H <= 0 ? true : tAct >= tm.tmin;
      let CR = null, RL = null;
      if (c.tPrev > 0 && c.years > 0) {
        CR = (c.tPrev - c.tAct) / c.years; // mm/yr
        if (CR > 0) RL = (c.tAct - mm(tm.tmin)) / CR;
      }
      const RCA = (tAct - tm.tmin) * 1000; // mils
      const N = CR != null ? inch(CR) * 1000 : null; // mpy
      const Ht = C.ht653({ St, E, t: tAct, Dft, whole: true }) * M_PER_FT; // m dari dasar course
      const testLevel = z + Ht;
      if (H > 0) testLimit = Math.min(testLimit, testLevel);
      rows.push({
        n: i + 1, z, H, S, St, E, tminIn: tm.tmin, tminMm: mm(tm.tmin), floored: tm.floored,
        tAct: c.tAct, ok, CR, RL, RCA, N, HtFromCourse: Ht, testLevel, aboveLiquid: H <= 0
      });
      z += c.w / 1000;
    });
    return { rows, testLimit, shellHeight: z };
  };

  /* ---------- LTA API 653 4.3.2.1 ---------- */
  C.lta653 = function ({ D, t2, readings, spacing }) {
    const Lin = Math.min(3.7 * Math.sqrt(ft(D) * inch(t2)), 40);
    const Lmm = mm(Lin);
    let t1 = null, idx = -1, n = 0;
    if (readings.length) {
      n = spacing > 0 ? Math.max(Math.round(Lmm / spacing) + 1, 5) : readings.length;
      n = Math.min(n, readings.length);
      for (let i = 0; i + n <= readings.length; i++) {
        const avg = readings.slice(i, i + n).reduce((a, b) => a + b, 0) / n;
        if (t1 === null || avg < t1) { t1 = avg; idx = i; }
      }
    }
    return { Lin, Lmm, t1, idx, n };
  };

  /* ---------- API 650 5.6.3 1-foot method (SI) ---------- */
  C.shellMinNominal650 = function (D) {
    return DATA.shellMin650.find(r => D < r.dMax).t;
  };
  C.oneFoot650 = function ({ D, H, G, Sd, St, CA }) {
    const h = Math.max(H - 0.3, 0);
    const td = 4.9 * D * h * G / Sd + CA;
    const tt = 4.9 * D * h / St;
    return { td, tt };
  };

  /* ---------- Bottom API 653 4.4.5 ---------- */
  C.mrt653 = function ({ RTbc, RTip, StPr, UPr, Or }) {
    const base = Math.min(RTbc, RTip);
    return { base, MRT: base - Or * (StPr + UPr) };
  };
  C.maxInterval653 = function ({ base, StPr, UPr, MRTmin, cap }) {
    const rate = StPr + UPr;
    if (rate <= 0) return cap;
    return Math.max(0, Math.min((base - MRTmin) / rate, cap));
  };

  /* Annular API 653 Table 4.5 (SG<1). t1 in, stress psi */
  C.annular653 = function ({ tShell, stress }) {
    const T = DATA.annular653;
    const r = T.tRows.findIndex(x => tShell <= x);
    const ci = T.sCols.findIndex(x => stress < x);
    if (ci < 0) return { outOfTable: true };
    const step = T.val[r][ci];
    // interpolasi linier antar batas kolom
    let interp = step;
    if (ci > 0) {
      const s0 = T.sCols[ci - 1], s1 = T.sCols[ci];
      const v0 = T.val[r][ci - 1], v1 = T.val[r][ci];
      interp = v0 + (v1 - v0) * (stress - s0) / (s1 - s0);
    } else interp = T.val[r][0];
    return { row: r, col: ci, step, interp };
  };
  C.annular650Lookup = function (tShell, stress) {
    const T = DATA.annular650;
    const r = T.tRows.findIndex(x => tShell <= x);
    const ci = T.sCols.findIndex(x => stress <= x);
    if (r < 0 || ci < 0) return null;
    return { row: r, col: ci, tb: T.val[r][ci] };
  };

  /* ---------- Wind girder API 650 5.9.6 (SI) ---------- */
  C.windH1 = function ({ t, D, V, Pwv }) {
    const pwv = Pwv > 0 ? Pwv : 1.48 * Math.pow(V / 190, 2);
    const Pwd = pwv + 0.24;
    const H1 = 9.47 * t * Math.sqrt(Math.pow(t / D, 3)) * (1.72 / Pwd);
    return { Pwv: pwv, Pwd, H1 };
  };
  C.transformed = function (courses, tUni) {
    return courses.map(c => ({ ...c, Wtr: c.w * Math.pow(tUni / c.t, 2.5) }));
  };

  /* ---------- Roof API 650 5.10.5 / 5.10.6 (SI) ---------- */
  C.coneRoof650 = function ({ D, thetaDeg, B, U, E, CA }) {
    const s = Math.sin(thetaDeg * Math.PI / 180);
    const tB = 2 * 1000 * D / s * Math.sqrt(B / (1000 * E)) + CA;
    const tU = 2 * 1000 * D / s * Math.sqrt(U / (1.33 * 1000 * E)) + CA;
    return { tB, tU, t: Math.max(tB, tU, 5) };
  };
  C.domeRoof650 = function ({ rr, B, U, E, CA }) {
    const tB = 4 * 1000 * rr * Math.sqrt(B / (1000 * E)) + CA;
    const tU = 4 * 1000 * rr * Math.sqrt(U / (1.33 * 1000 * E)) + CA;
    return { tB, tU, t: Math.max(tB, tU, 5) };
  };

  /* ---------- Toleransi dimensi ---------- */
  C.roundTol = function (Dm) {
    const Dft = ft(Dm);
    return DATA.roundness.find(r => Dft < r.dMaxFt);
  };
  C.misalignVert = function (t, std) { // mm
    return t > 16 ? Math.min(0.10 * t, 3) : 1.5;
  };
  C.projHoriz = function (tUpper) { // mm
    return tUpper < 8 ? 1.5 : Math.min(0.20 * tUpper, 3);
  };
  C.weldReinf = function (t, horizontal) {
    const r = DATA.weldReinf650.find(x => t <= x[0]);
    return horizontal ? r[2] : r[1];
  };

  /* ---------- Settlement API 653 Annex B ---------- */
  /* Least-squares Elev = a + p cosθ + q sinθ  ≡ a + b cos(θ + c) */
  C.cosineFit = function (theta, y) {
    const n = y.length;
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], v = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const f = [1, Math.cos(theta[i]), Math.sin(theta[i])];
      for (let r = 0; r < 3; r++) { v[r] += f[r] * y[i]; for (let c = 0; c < 3; c++) M[r][c] += f[r] * f[c]; }
    }
    const sol = solve3(M, v);
    const [a, p, q] = sol;
    const b = Math.hypot(p, q);
    const c = Math.atan2(-q, p); // a + b cos(θ + c) = a + b cosθ cos c − b sinθ sin c
    const pred = theta.map(t => a + p * Math.cos(t) + q * Math.sin(t));
    const mean = y.reduce((s, x) => s + x, 0) / n;
    const Syy = y.reduce((s, x) => s + (x - mean) ** 2, 0);
    const SSE = y.reduce((s, x, i) => s + (x - pred[i]) ** 2, 0);
    const R2 = Syy > 0 ? (Syy - SSE) / Syy : 1;
    return { a, b, c, pred, R2, Syy, SSE };
  };
  function solve3(A, b) {
    const M = A.map((r, i) => [...r, b[i]]);
    for (let i = 0; i < 3; i++) {
      let p = i;
      for (let r = i + 1; r < 3; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
      [M[i], M[p]] = [M[p], M[i]];
      for (let r = 0; r < 3; r++) {
        if (r === i) continue;
        const f = M[r][i] / M[i][i];
        for (let c = i; c < 4; c++) M[r][c] -= f * M[i][c];
      }
    }
    return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
  }

  /* Evaluasi B.2.2.4 + B.3.2.1. elev (mm), equally spaced. step k = subset (Note). */
  C.settlementCosine = function ({ elev, D, H, Y, E, k = 1 }) {
    const n = elev.length;
    const theta = elev.map((_, i) => 2 * Math.PI * i / n);
    const fit = C.cosineFit(theta, elev);
    const U = elev.map((e, i) => e - fit.pred[i]);
    const S = U.map((u, i) => u - (0.5 * U[(i - k + n) % n] + 0.5 * U[(i + k) % n]));
    const Lft = ft(Math.PI * D / n) * k;
    const SmaxFt = (Lft * Lft * Y * 11) / (2 * E * ft(H));
    const Smax = SmaxFt * M_PER_FT * 1000; // mm
    const uniform = Math.min(...elev);
    return { fit, U, S, Lft, Smax, SmaxIn: SmaxFt * 12, uniform };
  };

  /* B.3.2.2 */
  C.settlementArc = function ({ Sarc, D, H, Y, E, roof }) {
    const Dft = ft(D), Hft = ft(H), Sarcft = ft(Sarc);
    const row = DATA.settleK.find(r => Dft <= r[0]);
    if (!row) return { na: true };
    const K = roof === 'open' ? row[1] : row[2];
    if (K == null) return { na: true };
    const SmaxIn = Math.min(K * Sarcft * (Dft / Hft) * (Y / E), 4.0);
    return { K, SmaxIn, Smax: mm(SmaxIn) };
  };

  /* B.3.3 bulge/depression. R (m) → BB (mm) */
  C.bulge = function (Rm) {
    const BBin = 0.37 * ft(Rm);
    return { BBin, BB: mm(BBin) };
  };

  /* B.3.4 edge settlement. R ft, D ft → in */
  function interpCurve(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      }
    }
    return pts[pts.length - 1][1];
  }
  C.edgeAllow = function (curves, Dft, Rft) {
    const ds = Object.keys(curves).map(Number).sort((a, b) => a - b);
    const flags = [];
    if (Rft > 6) flags.push('R > 6 ft: di luar grafik, nilai diambil pada R = 6 ft');
    const R = Math.min(Rft, 6);
    if (Dft <= ds[0]) { if (Dft < ds[0]) flags.push('D < 20 ft: memakai kurva 20 ft'); return { B: interpCurve(curves[ds[0]], R), flags }; }
    if (Dft >= ds[ds.length - 1]) return { B: interpCurve(curves[ds[ds.length - 1]], R), flags };
    let i = ds.findIndex(d => d >= Dft);
    const d0 = ds[i - 1], d1 = ds[i];
    const b0 = interpCurve(curves[d0], R), b1 = interpCurve(curves[d1], R);
    return { B: b0 + (b1 - b0) * (Dft - d0) / (d1 - d0), flags };
  };
  C.edgeSettlement = function ({ D, R, alphaDeg }) {
    const Dft = ft(D), Rft = ft(R);
    const bew = C.edgeAllow(DATA.edgeBew, Dft, Rft);
    const be = C.edgeAllow(DATA.edgeBe, Dft, Rft);
    const a = (alphaDeg || 0) * Math.PI / 180;
    const Balpha = be.B - (be.B - bew.B) * Math.sin(a);
    return { BewIn: bew.B, BeIn: be.B, BalphaIn: Balpha, flags: [...new Set([...bew.flags, ...be.flags])] };
  };

  /* ---------- Inspection interval API 653 6.3 / 6.4 ---------- */
  C.externalInterval = function (RCAmils, Nmpy) {
    if (!(Nmpy > 0)) return 5;
    return Math.min(5, RCAmils / (4 * Nmpy));
  };
  C.utInterval = function (RCAmils, Nmpy) {
    if (!(Nmpy > 0)) return 5;
    return Math.min(15, RCAmils / (2 * Nmpy));
  };
  C.initialInternal = function ({ credits, caIn, crMpy, rpb }) {
    let yrs = 10 + credits;
    let caCredit = 0;
    if (caIn > 0.150) caCredit = (caIn * 1000 - 150) / (crMpy > 0 ? crMpy : 15);
    yrs += caCredit;
    const cap = rpb ? 30 : 20;
    return { yrs: Math.min(yrs, cap), raw: yrs, caCredit, cap };
  };

  /* ---------- statistik bantu ---------- */
  C.stats = function (arr) {
    const a = arr.filter(x => Number.isFinite(x));
    if (!a.length) return { n: 0 };
    const min = Math.min(...a), max = Math.max(...a);
    const avg = a.reduce((s, x) => s + x, 0) / a.length;
    return { n: a.length, min, max, avg };
  };

  root.TKCalc = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
