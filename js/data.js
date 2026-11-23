/* Toolkit Tangki — data tabel referensi API 653 (5th Ed. 2014) & API 650 (2020).
 * Semua nilai disalin dari tabel/standar; kurva grafik (Figure B.11/B.12) didigitasi
 * dari gambar dan bersifat pendekatan — verifikasi terhadap dokumen asli bila hasil kritis.
 */
(function (root) {
  const D = {};

  /* API 653 Table 4.1 — Maximum Allowable Shell Stresses (psi).
   * [nama, Y, T]. S & St dihitung dari Y,T per 4.3.3.1/4.3.3.2 (dibulatkan 100 psi),
   * hasilnya identik dengan Table 4.1. */
  D.mat653 = [
    ['A283-C', 30000, 55000], ['A285-C', 30000, 55000], ['A36', 36000, 58000],
    ['A131-A, B, CS', 34000, 58000], ['A131-EH 36', 51000, 71000],
    ['A573-58', 32000, 58000], ['A573-65', 35000, 65000], ['A573-70', 42000, 70000],
    ['A516-55', 30000, 55000], ['A516-60', 32000, 60000], ['A516-65', 35000, 65000],
    ['A516-70', 38000, 70000], ['A662-B', 40000, 65000], ['A662-C', 43000, 70000],
    ['A537-Class 1', 50000, 70000], ['A537-Class 2', 60000, 80000],
    ['A633-C, D', 50000, 70000], ['A678-A', 50000, 70000], ['A678-B', 60000, 80000],
    ['A737-B', 50000, 70000], ['A841', 50000, 70000],
    ['A10 (obsolete)', 30000, 55000], ['A7 (obsolete)', 33000, 60000],
    ['A442-55 (obsolete)', 30000, 55000], ['A442-60 (obsolete)', 32000, 60000],
    ['CSA G40.21 38W', 38000, 60000], ['CSA G40.21 44W', 44000, 65000],
    ['CSA G40.21 50W', 50000, 65000], ['CSA G40.21 50WT', 50000, 70000],
    ['Unknown (tidak diketahui)', 30000, 55000]
  ];

  /* API 650 Table 5.2a (SI) — [nama, Y MPa, T MPa, Sd MPa, St MPa] */
  D.mat650 = [
    ['A283M C', 205, 380, 137, 154], ['A285M C', 205, 380, 137, 154],
    ['A131M A, B', 235, 400, 157, 171], ['A36M', 250, 400, 160, 171],
    ['A131M EH 36', 360, 490, 196, 210], ['A573M 400', 220, 400, 147, 165],
    ['A573M 450', 240, 450, 160, 180], ['A573M 485', 290, 485, 193, 208],
    ['A516M 380', 205, 380, 137, 154], ['A516M 415', 220, 415, 147, 165],
    ['A516M 450', 240, 450, 160, 180], ['A516M 485', 260, 485, 173, 195],
    ['A662M B', 275, 450, 180, 193], ['A662M C', 295, 485, 194, 208],
    ['A537M 1 (t ≤ 65)', 345, 485, 194, 208], ['A537M 2 (t ≤ 65)', 415, 550, 220, 236],
    ['A633M C, D (t ≤ 65)', 345, 485, 194, 208], ['A737M B', 345, 485, 194, 208],
    ['A841M Class 1', 345, 485, 194, 208], ['A841M Class 2', 415, 550, 220, 236],
    ['CSA G40.21M 260W', 260, 410, 164, 176], ['CSA G40.21M 300W', 300, 440, 176, 189],
    ['CSA G40.21M 350W', 350, 450, 180, 193],
    ['National 235', 235, 365, 137, 154], ['National 250', 250, 400, 157, 171],
    ['National 275', 275, 430, 167, 184],
    ['ISO 630 S275 (t ≤ 16)', 275, 410, 164, 176], ['ISO 630 S355 (t ≤ 16)', 355, 470, 188, 201],
    ['EN 10025 S275 (t ≤ 16)', 275, 410, 164, 176], ['EN 10025 S355 (t ≤ 16)', 355, 470, 188, 201]
  ];

  /* API 653 Table 4.2 — joint efficiency (dipilih user) */
  D.jointEff653 = [
    { v: 1.0, l: 'API 650 ed.7+ (1980–kini) Butt, Basic Standard — 1.00' },
    { v: 0.85, l: 'API 650 ed.7+ Butt, Annex A Spot RT — 0.85' },
    { v: 0.70, l: 'API 650 ed.7+ Butt, Annex A No RT — 0.70' },
    { v: 0.85, l: 'API 650 ed.1–6 (1961–1978) Butt, Basic — 0.85' },
    { v: 1.0, l: 'API 650 ed.1–6 Butt, Annex D & G — 1.00' },
    { v: 0.85, l: 'API 12C ed.14–15 (1957–1958) Butt — 0.85' },
    { v: 0.75, l: 'API 12C ed.3–13 Lap (double, t ≤ 3/8") — 0.75' },
    { v: 0.85, l: 'API 12C ed.3–13 Butt — 0.85' },
    { v: 0.70, l: 'API 12C Lap (double, t ≤ 7/16") — 0.70' },
    { v: 0.70, l: 'Unknown, Butt — 0.70' },
    { v: 0.35, l: 'Unknown, Lap (single) — 0.35' },
    { v: 1.0, l: 'Jauh dari las ≥ max(1", 2t) — E = 1.0 (4.3.3.1)' }
  ];

  /* API 653 Table 4.3 — riveted joint efficiency */
  D.jointRivet = [
    { v: 0.45, l: 'Lap, 1 baris — 0.45' }, { v: 0.60, l: 'Lap, 2 baris — 0.60' },
    { v: 0.70, l: 'Lap, 3 baris — 0.70' }, { v: 0.75, l: 'Lap, 4 baris — 0.75' },
    { v: 0.75, l: 'Butt, 2 baris — 0.75' }, { v: 0.85, l: 'Butt, 3 baris — 0.85' },
    { v: 0.90, l: 'Butt, 4 baris — 0.90' }, { v: 0.91, l: 'Butt, 5 baris — 0.91' },
    { v: 0.92, l: 'Butt, 6 baris — 0.92' }, { v: 1.0, l: '≥ 6" dari rivet — 1.00' }
  ];

  /* API 653 Table 4.4 — bottom plate minimum thickness at next inspection (in) */
  D.bottomMin653 = [
    { v: 0.10, l: 'Tanpa sarana deteksi & containment kebocoran bottom — 0.10 in (2.54 mm)' },
    { v: 0.05, l: 'Dengan sarana deteksi & containment kebocoran (RPB) — 0.05 in (1.27 mm)' },
    { v: 0.05, l: 'Reinforced lining > 0.05 in per API 652 — 0.05 in (1.27 mm)' }
  ];

  /* API 653 Table 4.5 — annular plate thickness (in), SG < 1.0.
   * rows: batas atas tebal shell course-1 (in); cols: batas stress (psi, "<") */
  D.annular653 = {
    tRows: [0.75, 1.0, 1.25, 1.5, Infinity],
    sCols: [24300, 27000, 29700, 32400],
    val: [
      [0.17, 0.20, 0.23, 0.30],
      [0.17, 0.22, 0.31, 0.38],
      [0.17, 0.26, 0.38, 0.48],
      [0.22, 0.34, 0.47, 0.59],
      [0.27, 0.40, 0.53, 0.68]
    ]
  };

  /* API 650 Table 5.1a (SI) — annular plate thickness (mm).
   * rows: batas atas tebal shell course-1 (mm, "≤"); cols: stress (MPa, "≤") */
  D.annular650 = {
    tRows: [19, 25, 32, 40, 45],
    sCols: [190, 210, 220, 250],
    val: [
      [6, 6, 7, 9],
      [6, 7, 10, 11],
      [6, 9, 12, 14],
      [8, 11, 14, 17],
      [9, 13, 16, 19]
    ]
  };

  /* API 650 5.6.1.1 — minimum nominal shell thickness by D (m) */
  D.shellMin650 = [
    { dMax: 15, t: 5 }, { dMax: 36, t: 6 }, { dMax: 60.0001, t: 8 }, { dMax: Infinity, t: 10 }
  ];

  /* Roundness: API 650 7.5.3 (mm) & API 653 Table 10.2 (in) — batas D (ft) */
  D.roundness = [
    { dMaxFt: 40, mm: 13, inch: 0.5 },
    { dMaxFt: 150, mm: 19, inch: 0.75 },
    { dMaxFt: 250, mm: 25, inch: 1.0 },
    { dMaxFt: Infinity, mm: 32, inch: 1.25 }
  ];

  /* API 650 8.5.2 d) — max weld reinforcement (mm): [tMax, vertical, horizontal] */
  D.weldReinf650 = [
    [13, 2.5, 3], [25, 3, 5], [Infinity, 5, 6]
  ];

  /* API 653 B.3.2.2 — K factor: [Dmax ft, open-top, fixed roof] */
  D.settleK = [
    [50, 28.7, 10.5], [80, 7.8, 5.8], [120, 6.5, 3.9], [180, 4.0, 2.3],
    [240, 3.6, null], [300, 2.4, null]
  ];

  /* API 653 Table 6.1 — tank safeguard credits (tahun) */
  D.safeguards = [
    { k: 'frp', l: 'i. Fiberglass-reinforced lining bottom (API RP 652)', yrs: 5 },
    { k: 'thin', l: 'ii. Internal thin-film coating (API RP 652)', yrs: 2 },
    { k: 'cp', l: 'iii. Cathodic protection soil-side (API RP 651)', yrs: 5 },
    { k: 'rpb', l: 'iv. Release prevention barrier (API 650 Annex I)', yrs: 10 },
    { k: 'ss', l: 'vi. Bottom stainless steel (Annex SC + S/X), risiko sangat rendah', yrs: 10 }
  ];

  /* API 653 Figure B.11 (Bew, lap weld ≈ sejajar shell) & Figure B.12 (Be, tanpa las /
   * butt / lap tegak lurus shell). Titik [R ft, B in] per diameter (ft). DIGITASI. */
  D.edgeBew = {
    20: [[0, 2], [4.53, 2], [6, 2.46]],
    30: [[0, 2], [3.34, 2], [6, 3.0]],
    40: [[0, 2], [2.64, 2], [6, 3.45]],
    50: [[0, 2], [2.24, 2], [6, 3.85]],
    60: [[0, 2], [1.9, 2], [6, 4.25]],
    80: [[0, 2], [1.5, 2], [4, 3.86], [6, 4.82]],
    100: [[0, 2], [1.5, 2], [1.75, 2.5], [4, 4.08], [6, 5.43]],
    120: [[0, 2], [1.5, 2], [2.0, 2.95], [4, 4.54], [6, 5.98]],
    160: [[0, 2], [1.5, 2], [2.52, 3.98], [3, 4.42], [4, 5.2], [5, 6.07], [6, 6.9]]
  };
  D.edgeBe = {
    20: [[0, 2], [3.34, 2], [6, 2.97]],
    30: [[0, 2], [2.51, 2], [6, 3.6]],
    40: [[0, 2], [1.88, 2], [6, 4.22]],
    50: [[0, 2], [1.67, 2], [6, 4.67]],
    60: [[0, 2], [1.5, 2], [4, 4.06], [6, 5.13]],
    80: [[0, 2], [1.5, 2], [1.94, 2.9], [4, 4.35], [6, 5.97]],
    100: [[0, 2], [1.5, 2], [2.25, 3.5], [4, 5.09], [6, 6.64]],
    120: [[0, 2], [1.5, 2], [2.6, 4.2], [4, 5.75], [6, 7.24]],
    160: [[0, 2], [1.5, 2], [3.44, 5.86], [5.53, 8.0], [6, 8.0]]
  };

  root.TKData = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
