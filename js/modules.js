/* Toolkit Tangki — definisi modul (klasifikasi, parameter yang ditinjau, input, perhitungan).
 * Setiap modul: { id, cat, comp, title, refs, params, fields, table, compute(v) }.
 * compute menerima nilai field (sudah di-map) dan baris tabel, mengembalikan
 * { summary, checks, table, chart, notes }.
 * check.ok: true (memenuhi) | false (tidak memenuhi) | 'warn' (perlu tindak lanjut) | null (info).
 */
(function (root) {
  const C = root.TKCalc, DATA = root.TKData;
  const f = (x, d = 2) => (x == null || !Number.isFinite(x)) ? '–' : Number(x).toFixed(d);
  const num = x => Number.isFinite(x);
  const matOpts653 = DATA.mat653.map(m => ({ v: { Y: m[1], T: m[2] }, l: `${m[0]} (Y ${m[1].toLocaleString('en')} / T ${m[2].toLocaleString('en')} psi)` }));
  const matOpts650 = DATA.mat650.map(m => ({ v: { Y: m[1], T: m[2], Sd: m[3], St: m[4] }, l: `${m[0]} (Sd ${m[3]} / St ${m[4]} MPa)` }));
  const basisOpts = [
    { v: '650', l: 'API 650 — tangki baru (konstruksi)' },
    { v: '653', l: 'API 653 — tangki rekonstruksi' }
  ];
  const yesNo = [{ v: false, l: 'Tidak' }, { v: true, l: 'Ya' }];

  /* ---------- KLASIFIKASI ---------- */
  const CATS = [
    {
      id: 'A', title: 'Evaluasi & Perhitungan Komponen',
      desc: 'Perhitungan tebal minimum, sisa umur, dan kelayakan operasi per komponen.',
      groups: [
        { id: 'SH', title: 'Shell (dinding)' },
        { id: 'BT', title: 'Bottom & Annular' },
        { id: 'RF', title: 'Roof (atap)' },
        { id: 'IN', title: 'Interval Inspeksi' }
      ]
    },
    {
      id: 'B', title: 'Inspeksi Dimensional & Toleransi',
      desc: 'Pengukuran kuantitatif di lapangan dibandingkan dengan toleransi API.',
      groups: [
        { id: 'DT', title: 'Geometri shell' },
        { id: 'WD', title: 'Sambungan las' },
        { id: 'FD', title: 'Foundation' }
      ]
    },
    {
      id: 'C', title: 'Settlement',
      desc: 'Evaluasi penurunan tangki per API 653 Annex B dan API 650 7.3.7.',
      groups: [{ id: 'ST', title: 'Shell, edge & bottom settlement' }]
    }
  ];

  const M = [];
  const add = m => M.push(m);

  /* ================= A · SHELL ================= */
  add({
    id: 'SH-01', grp: 'SH', title: 'Tebal minimum shell per course',
    refs: ['API 653 4.3.3.1 a)', 'API 653 4.3.3.2 a)', 'API 653 Table 4.1 / 4.2 / 4.3', 'API 653 4.3.4 (riveted)'],
    params: ['tmin tiap course', 'Tebal aktual vs tmin', 'Laju korosi & sisa umur', 'Batas tinggi hydrotest Ht'],
    desc: 'Tebal minimum yang dapat diterima untuk seluruh course: tmin = 2.6 (H − 1) D G / (S E), minimum 0.1 in. S diambil dari Y dan T material (0.80Y / 0.429T untuk 2 course bawah, 0.88Y / 0.472T untuk course atas).',
    fields: [
      { k: 'D', l: 'Diameter nominal D', u: 'm', def: 30, link: 'D' },
      { k: 'HL', l: 'Tinggi cairan maks. (dari bottom)', u: 'm', def: 14.4, link: 'HL' },
      { k: 'G', l: 'Specific gravity G (tertinggi)', u: '–', def: 0.9, link: 'G' },
      { k: 'riv', l: 'Shell riveted?', type: 'sel', opts: yesNo, def: 0 },
      { k: 'E', l: 'Joint efficiency E', type: 'sel', opts: DATA.jointEff653.concat(DATA.jointRivet.map(o => ({ v: o.v, l: 'Riveted: ' + o.l }))), def: 0 },
      { k: 'CAn', l: 'Korosi s.d. inspeksi berikut (ditambah ke tmin)', u: 'mm', def: 0 }
    ],
    table: {
      k: 'courses', l: 'Data per course (course 1 = paling bawah)', link: 'courses',
      cols: [
        { k: 'w', l: 'Lebar (mm)', def: 2400 },
        { k: 'mat', l: 'Material', type: 'sel', opts: matOpts653, def: 0 },
        { k: 'tNom', l: 't nominal (mm)', def: 12 },
        { k: 'tAct', l: 't aktual min (mm)', def: 11 },
        { k: 'tPrev', l: 't sebelumnya (mm)', def: '' },
        { k: 'yrs', l: 'Selang (tahun)', def: '' }
      ],
      rows: [
        { w: 2400, mat: 0, tNom: 14, tAct: 12.6, tPrev: 13.2, yrs: 10 },
        { w: 2400, mat: 0, tNom: 12, tAct: 10.9, tPrev: 11.3, yrs: 10 },
        { w: 2400, mat: 0, tNom: 10, tAct: 9.2, tPrev: 9.5, yrs: 10 },
        { w: 2400, mat: 0, tNom: 8, tAct: 7.1, tPrev: 7.4, yrs: 10 },
        { w: 2400, mat: 0, tNom: 8, tAct: 7.3, tPrev: 7.5, yrs: 10 },
        { w: 2400, mat: 0, tNom: 8, tAct: 7.4, tPrev: 7.6, yrs: 10 }
      ]
    },
    compute(v, rows) {
      const courses = rows.map(r => ({ w: r.w, Y: r.mat.Y, T: r.mat.T, E: v.E, tAct: r.tAct, tPrev: r.tPrev, years: r.yrs }));
      const res = C.shellCourses653({ D: v.D, HL: v.HL, G: v.G, courses, riveted: v.riv });
      const checks = [];
      const trows = res.rows.map(r => {
        const need = r.tminMm + (v.CAn || 0);
        const ok = r.aboveLiquid ? null : r.tAct >= need;
        if (!r.aboveLiquid) checks.push({ l: `Course ${r.n}: t aktual ≥ tmin${v.CAn ? ' + CA' : ''}`, meas: f(r.tAct), lim: '≥ ' + f(need), u: 'mm', ok, ref: '4.3.3.1' });
        return [r.n, f(r.z, 2), f(r.H, 2), r.S.toLocaleString('en'), f(r.tminMm) + (r.floored ? '*' : ''), f(r.tAct), num(r.CR) ? f(r.CR, 3) : '–', num(r.RL) ? f(r.RL, 1) : '–', f(r.testLevel, 2), { ok }];
      });
      const live = res.rows.filter(r => !r.aboveLiquid);
      const rl = live.map(r => r.RL).filter(num);
      const minRL = rl.length ? Math.min(...rl) : null;
      checks.push({ l: 'Batas tinggi hydrotest (min. semua course) ≥ tinggi cairan maks.', meas: f(res.testLimit), lim: '≥ ' + f(v.HL), u: 'm', ok: res.testLimit >= v.HL ? true : 'warn', ref: '4.3.3.2' });
      // interval external/UT dari course paling kritis (RCA/N terkecil)
      let ext = 5, ut = 5;
      live.forEach(r => { if (num(r.N) && r.N > 0) { ext = Math.min(ext, C.externalInterval(r.RCA, r.N)); ut = Math.min(ut, C.utInterval(r.RCA, r.N)); } });
      return {
        summary: [
          { l: 'Sisa umur terpendek', v: minRL != null ? f(minRL, 1) : '–', u: 'tahun' },
          { l: 'Level hydrotest maks.', v: f(res.testLimit), u: 'm' },
          { l: 'Interval external maks.', v: f(Math.max(ext, 0), 1), u: 'tahun' },
          { l: 'Interval UT shell maks.', v: f(Math.max(ut, 0), 1), u: 'tahun' }
        ],
        checks,
        table: { head: ['Course', 'Elev. dasar (m)', 'H (m)', 'S (psi)', 'tmin (mm)', 't akt. (mm)', 'CR (mm/th)', 'Sisa umur (th)', 'Level Ht (m)', 'Status'], rows: trows },
        charts: [{
          type: 'tank', title: 'Konfigurasi shell — status per course', D: v.D, HL: v.HL,
          courses: res.rows.map((r, i) => ({ w: rows[i].w, t: r.tAct, ok: r.aboveLiquid ? null : r.tAct >= r.tminMm + (v.CAn || 0), label: r.aboveLiquid ? 'di atas cairan' : 'tmin ' + f(r.tminMm + (v.CAn || 0)) }))
        }],
        chart: {
          type: 'bars', xLabel: 'Course', yLabel: 'mm',
          cats: res.rows.map(r => 'C' + r.n),
          series: [{ name: 't aktual', y: res.rows.map(r => r.tAct), cls: 's1' }, { name: 'tmin', y: res.rows.map(r => r.aboveLiquid ? null : r.tminMm + (v.CAn || 0)), cls: 'lim', line: true }]
        },
        notes: [
          '* tmin dibatasi minimum 0.1 in (2.54 mm).',
          'Rumus hanya memperhitungkan beban cairan. Beban angin, gempa, vakum, temperatur > 200 °F, beban nozzle, dan settlement dievaluasi terpisah (4.3.3.5).',
          'Metode 1-foot ini berlaku untuk D ≤ 200 ft (61 m). Di atas itu gunakan variable design point (4.3.3.4).',
          'Interval external = min(5, RCA/4N); interval UT = min(15, RCA/2N) — 6.3.2.1 dan 6.3.3.2.'
        ].concat(v.D > 61 ? ['⚠ D > 61 m: wajib variable design point method (4.3.3.4).'] : [])
      };
    }
  });

  add({
    id: 'SH-02', grp: 'SH', title: 'Area korosi lokal (LTA)',
    refs: ['API 653 4.3.2.1', 'API 653 4.3.3.1 b)', 'Figure 4.1'],
    params: ['Panjang kritis L', 't2 (tebal terkecil)', 't1 (rata-rata terendah sepanjang L)', 't1 ≥ tmin, t2 ≥ 60% tmin'],
    desc: 'L = 3.7 √(D t2), maks. 40 in. Rata-rata t1 dihitung bergeser sepanjang L dari profil pembacaan pada bidang vertikal paling terkorosi (minimal 5 titik).',
    fields: [
      { k: 'D', l: 'Diameter D', u: 'm', def: 30, link: 'D' },
      { k: 'H', l: 'Tinggi cairan di atas titik terendah L', u: 'm', def: 13.2 },
      { k: 'G', l: 'Specific gravity G', u: '–', def: 0.9, link: 'G' },
      { k: 'mat', l: 'Material', type: 'sel', opts: matOpts653, def: 0 },
      { k: 'low', l: 'Berada di 2 course terbawah?', type: 'sel', opts: yesNo, def: 1 },
      { k: 'E', l: 'Joint efficiency E', type: 'sel', opts: DATA.jointEff653, def: 11 },
      { k: 't2', l: 't2 tebal terkecil (tanpa pit)', u: 'mm', def: 7.8 },
      { k: 'sp', l: 'Jarak antar titik pembacaan', u: 'mm', def: 50 },
      { k: 'CAn', l: 'Korosi s.d. inspeksi berikut', u: 'mm', def: 0.5 }
    ],
    table: {
      k: 'pts', l: 'Profil tebal sepanjang bidang vertikal (dari bawah ke atas)',
      cols: [{ k: 't', l: 'Tebal (mm)', def: '' }],
      rows: [11.2, 10.4, 9.6, 8.9, 8.2, 7.8, 8.1, 8.6, 9.3, 10.1, 10.8, 11.3].map(t => ({ t }))
    },
    compute(v, rows) {
      const readings = rows.map(r => r.t).filter(num);
      const r = C.lta653({ D: v.D, t2: v.t2, readings, spacing: v.sp });
      const { S } = C.stress653(v.mat.Y, v.mat.T, v.low);
      const tm = C.tmin653({ Dft: C.ft(v.D), Hft: C.ft(v.H), G: v.G, S, E: v.E, whole: false });
      const tmin = C.mm(tm.tmin);
      const ca = v.CAn || 0;
      const checks = [
        { l: 't1 (rata-rata terendah sepanjang L) ≥ tmin + CA', meas: f(r.t1), lim: '≥ ' + f(tmin + ca), u: 'mm', ok: r.t1 != null ? r.t1 >= tmin + ca : null, ref: '4.3.2.1 e) i' },
        { l: 't2 ≥ 60% tmin + CA', meas: f(v.t2), lim: '≥ ' + f(0.6 * tmin + ca), u: 'mm', ok: v.t2 >= 0.6 * tmin + ca, ref: '4.3.2.1 e) ii' }
      ];
      if (readings.length < 5) checks.push({ l: 'Jumlah titik pembacaan ≥ 5', meas: readings.length, lim: '≥ 5', u: 'titik', ok: false, ref: '4.3.2.1 c)' });
      const hi = new Set(); for (let i = r.idx; i < r.idx + r.n; i++) hi.add(i);
      return {
        summary: [
          { l: 'Panjang kritis L', v: f(r.Lmm, 0), u: 'mm', s: f(r.Lin, 2) + ' in' },
          { l: 'Titik dalam L', v: r.n, u: 'titik' },
          { l: 't1', v: f(r.t1), u: 'mm' },
          { l: 'tmin lokal (H dari dasar L)', v: f(tmin), u: 'mm', s: 'S = ' + S.toLocaleString('en') + ' psi' }
        ],
        checks,
        chart: {
          type: 'line', xLabel: 'Titik ke- (dari bawah)', yLabel: 'mm',
          x: readings.map((_, i) => i + 1),
          series: [{ name: 'Tebal', y: readings, cls: 's1', mark: hi }],
          hlines: [{ y: tmin + ca, name: 'tmin + CA', cls: 'lim' }, { y: 0.6 * tmin + ca, name: '0.6 tmin + CA', cls: 'lim2' }]
        },
        notes: ['Titik yang diberi tanda adalah jendela L dengan rata-rata terendah (t1).', 'Cek juga beban tambahan per 4.3.3.5.']
      };
    }
  });

  add({
    id: 'SH-03', grp: 'SH', title: 'Pitting tersebar pada shell',
    refs: ['API 653 4.3.2.2', 'Figure 4.2'],
    params: ['Sisa tebal di pit ≥ ½ tmin', 'Jumlah dimensi pit ≤ 2 in per 8 in vertikal'],
    desc: 'Pit tersebar boleh diabaikan bila sisa tebal di setiap pit tidak kurang dari setengah tmin (tanpa CA) dan jumlah dimensi pit sepanjang garis vertikal tidak lebih dari 2 in dalam panjang 8 in.',
    fields: [{ k: 'tmin', l: 'tmin course (tanpa CA), dari SH-01', u: 'mm', def: 7.6 }],
    table: {
      k: 'pits', l: 'Pit sepanjang satu garis vertikal',
      cols: [{ k: 'y', l: 'Posisi vertikal (mm)', def: '' }, { k: 'd', l: 'Dimensi vertikal pit (mm)', def: '' }, { k: 'rt', l: 'Sisa tebal di pit (mm)', def: '' }],
      rows: [{ y: 120, d: 12, rt: 5.1 }, { y: 180, d: 15, rt: 4.6 }, { y: 260, d: 10, rt: 5.4 }, { y: 410, d: 18, rt: 3.6 }]
    },
    compute(v, rows) {
      const P = rows.filter(r => num(r.y) && num(r.d));
      let worst = 0, at = null;
      P.forEach(p => {
        const s = P.filter(q => q.y >= p.y && q.y + q.d <= p.y + 203.2).reduce((a, q) => a + q.d, 0);
        if (s > worst) { worst = s; at = p.y; }
      });
      const half = 0.5 * v.tmin;
      const checks = rows.filter(r => num(r.rt)).map((r, i) => ({ l: `Pit @ ${f(r.y, 0)} mm: sisa tebal ≥ ½ tmin`, meas: f(r.rt), lim: '≥ ' + f(half), u: 'mm', ok: r.rt >= half, ref: '4.3.2.2 a)' }));
      checks.push({ l: 'Jumlah dimensi pit dalam 8 in (203 mm) ≤ 2 in (50.8 mm)', meas: f(worst, 1), lim: '≤ 50.8', u: 'mm', ok: worst <= 50.8, ref: '4.3.2.2 b)' });
      return {
        summary: [{ l: 'Jumlah dimensi terbesar / 203 mm', v: f(worst, 1), u: 'mm', s: at != null ? 'mulai ' + f(at, 0) + ' mm' : '' }, { l: 'Batas sisa tebal', v: f(half), u: 'mm' }],
        checks,
        notes: ['Jika salah satu syarat tidak terpenuhi, area dievaluasi sebagai LTA (SH-02) atau diperbaiki.']
      };
    }
  });

  add({
    id: 'SH-04', grp: 'SH', title: 'Desain tebal shell (1-foot method)',
    refs: ['API 650 5.6.3.2', 'API 650 5.6.1.1', 'API 650 Table 5.2a'],
    params: ['td (kondisi produk)', 'tt (hydrotest)', 'Tebal nominal minimum', 'Tebal terpasang vs syarat'],
    desc: 'td = 4.9 D (H − 0.3) G / Sd + CA dan tt = 4.9 D (H − 0.3) / St (SI). Tebal syarat = maks(td, tt, tebal minimum 5.6.1.1). Tidak untuk D > 61 m.',
    fields: [
      { k: 'D', l: 'Diameter D', u: 'm', def: 30, link: 'D' },
      { k: 'HL', l: 'Design liquid level H', u: 'm', def: 14.4, link: 'HL' },
      { k: 'G', l: 'Design specific gravity G', u: '–', def: 0.9, link: 'G' },
      { k: 'CA', l: 'Corrosion allowance', u: 'mm', def: 1.5 }
    ],
    table: {
      k: 'courses', l: 'Course (1 = paling bawah)', link: 'courses',
      cols: [
        { k: 'w', l: 'Lebar (mm)', def: 2400 },
        { k: 'mat', l: 'Material (Table 5.2a)', type: 'sel', opts: matOpts650, def: 3 },
        { k: 'tNom', l: 't terpasang (mm)', def: '' }
      ],
      rows: [14, 12, 10, 8, 8, 8].map(t => ({ w: 2400, mat: 3, tNom: t }))
    },
    compute(v, rows) {
      let z = 0;
      const tMinTab = C.shellMinNominal650(v.D);
      const checks = [], trows = [], ys = [], yreq = [];
      rows.forEach((r, i) => {
        const H = v.HL - z;
        const { td, tt } = C.oneFoot650({ D: v.D, H, G: v.G, Sd: r.mat.Sd, St: r.mat.St, CA: v.CA });
        let tmn = tMinTab;
        if (i === 0 && v.D > 3.2 && v.D < 15) tmn = Math.max(tmn, 6);
        const req = H > 0 ? Math.max(td, tt, tmn) : tmn;
        const ok = num(r.tNom) ? r.tNom >= req - 1e-9 : null;
        if (num(r.tNom)) checks.push({ l: `Course ${i + 1}: t terpasang ≥ t syarat`, meas: f(r.tNom), lim: '≥ ' + f(req), u: 'mm', ok, ref: '5.6.1.1' });
        trows.push([i + 1, f(H), H > 0 ? f(td) : '–', H > 0 ? f(tt) : '–', f(tmn, 0), f(req), num(r.tNom) ? f(r.tNom) : '–', { ok }]);
        ys.push(num(r.tNom) ? r.tNom : null); yreq.push(req);
        z += r.w / 1000;
      });
      return {
        summary: [{ l: 'Tebal nominal minimum (5.6.1.1)', v: tMinTab, u: 'mm' }, { l: 'Tinggi shell dari tabel', v: f(z), u: 'm' }],
        checks,
        table: { head: ['Course', 'H (m)', 'td (mm)', 'tt (mm)', 't min tabel', 't syarat (mm)', 't terpasang', 'Status'], rows: trows },
        charts: [{ type: 'tank', title: 'Konfigurasi shell — tebal terpasang vs syarat', D: v.D, HL: v.HL, courses: rows.map((r, i) => ({ w: r.w, t: num(r.tNom) ? r.tNom : yreq[i], ok: num(r.tNom) ? r.tNom >= yreq[i] - 1e-9 : null, label: 'syarat ' + f(yreq[i]) })) }],
        chart: { type: 'bars', xLabel: 'Course', yLabel: 'mm', cats: rows.map((_, i) => 'C' + (i + 1)), series: [{ name: 't terpasang', y: ys, cls: 's1' }, { name: 't syarat', y: yreq, cls: 'lim', line: true }] },
        notes: v.D > 61 ? ['⚠ D > 61 m: 1-foot method tidak boleh dipakai (5.6.3.1), gunakan variable-design-point.'] : ['Untuk 3.2 m < D < 15 m, course terbawah minimal 6 mm (Note 4).']
      };
    }
  });

  add({
    id: 'SH-05', grp: 'SH', title: 'Wind girder & stabilitas shell',
    refs: ['API 650 5.9.6.1', 'API 650 5.9.6.2', 'API 650 5.9.6.3'],
    params: ['Tinggi maks. shell tanpa stiffener H1', 'Tinggi transformed shell', 'Kebutuhan intermediate wind girder'],
    desc: 'H1 = 9.47 t √((t/D)³) (1.72 / Pwd), Pwd = Pwv + 0.24 kPa, Pwv = 1.48 (V/190)². Wtr = W (t_uniform / t_actual)^2.5.',
    fields: [
      { k: 'D', l: 'Diameter D', u: 'm', def: 30, link: 'D' },
      { k: 'V', l: 'Kecepatan angin desain (3-s gust)', u: 'km/h', def: 160 },
      { k: 'Pwv', l: 'Pwv dari building code (0 = pakai V)', u: 'kPa', def: 0 },
      { k: 'CA', l: 'Kurangi CA (cek kondisi terkorosi)', u: 'mm', def: 0 }
    ],
    table: {
      k: 'courses', l: 'Course (1 = paling bawah)', link: 'courses',
      cols: [{ k: 'w', l: 'Lebar (mm)', def: 2400 }, { k: 'tNom', l: 't (mm)', def: 8 }],
      rows: [14, 12, 10, 8, 8, 8].map(t => ({ w: 2400, tNom: t }))
    },
    compute(v, rows) {
      const cs = rows.filter(r => num(r.w) && num(r.tNom)).map(r => ({ w: r.w, t: r.tNom - (v.CA || 0) }));
      const tU = Math.min(...cs.map(c => c.t));
      const w = C.windH1({ t: tU, D: v.D, V: v.V, Pwv: v.Pwv });
      const tr = C.transformed(cs, tU);
      const Htr = tr.reduce((a, c) => a + c.Wtr, 0) / 1000;
      const need = Htr > w.H1 ? Math.ceil(Htr / w.H1) - 1 : 0;
      return {
        summary: [
          { l: 'H1 (maks. tanpa stiffener)', v: f(w.H1), u: 'm' },
          { l: 'Tinggi transformed shell', v: f(Htr), u: 'm' },
          { l: 'Pwd', v: f(w.Pwd, 3), u: 'kPa' },
          { l: 'Jumlah intermediate girder', v: need, u: 'buah' }
        ],
        checks: [{ l: 'Transformed shell ≤ H1 (tanpa intermediate girder)', meas: f(Htr), lim: '≤ ' + f(w.H1), u: 'm', ok: Htr <= w.H1 ? true : 'warn', ref: '5.9.6.3' }],
        table: { head: ['Course', 't (mm)', 'W (mm)', 'Wtr (mm)'], rows: tr.map((c, i) => [i + 1, f(c.t), f(c.w, 0), f(c.Wtr, 0)]) },
        notes: ['Bila diperlukan girder, letakkan di tengah tinggi transformed shell dan tidak dalam 150 mm dari sambungan horizontal (5.9.6.5). Section modulus dicek per 5.9.6.6.']
      };
    }
  });

  /* ================= A · BOTTOM ================= */
  add({
    id: 'BT-01', grp: 'BT', title: 'Minimum remaining thickness (MRT) bottom',
    refs: ['API 653 4.4.5.1', 'API 653 Table 4.4', 'API 653 6.4.2.2.1'],
    params: ['RTbc / RTip', 'Laju korosi StPr & UPr', 'MRT di akhir interval', 'Interval internal maksimum'],
    desc: 'MRT = min(RTbc, RTip) − Or (StPr + UPr). MRT harus ≥ nilai Table 4.4. StPr = 0 untuk area coated; UPr = 0 bila CP efektif.',
    fields: [
      { k: 'tOrig', l: 'Tebal awal plat bottom', u: 'mm', def: 8 },
      { k: 'age', l: 'Umur tangki (untuk UPr)', u: 'tahun', def: 20 },
      { k: 'RTbc', l: 'RTbc — sisa tebal korosi bawah (setelah repair)', u: 'mm', def: 6.2 },
      { k: 'RTip', l: 'RTip — sisa tebal korosi dalam (setelah repair)', u: 'mm', def: 6.0 },
      { k: 'StPr', l: 'StPr — laju korosi atas (tidak direpair)', u: 'mm/th', def: 0.08 },
      { k: 'UPrIn', l: 'UPr manual (kosong = hitung dari umur)', u: 'mm/th', def: '' },
      { k: 'coated', l: 'Area dilapisi coating (umur ≥ Or)?', type: 'sel', opts: yesNo, def: 0 },
      { k: 'cp', l: 'Cathodic protection efektif?', type: 'sel', opts: yesNo, def: 0 },
      { k: 'Or', l: 'Rencana interval Or', u: 'tahun', def: 10 },
      { k: 'des', l: 'Desain bottom/foundation', type: 'sel', opts: DATA.bottomMin653, def: 0 },
      { k: 'rpb', l: 'Ada release prevention barrier?', type: 'sel', opts: yesNo, def: 0 }
    ],
    compute(v) {
      const StPr = v.coated ? 0 : v.StPr;
      const UPr = v.cp ? 0 : (num(v.UPrIn) ? v.UPrIn : Math.max(0, (v.tOrig - v.RTbc) / v.age));
      const r = C.mrt653({ RTbc: v.RTbc, RTip: v.RTip, StPr, UPr, Or: v.Or });
      const MRTmin = C.mm(v.des);
      const cap = v.rpb ? 30 : 20;
      const Omax = C.maxInterval653({ base: r.base, StPr, UPr, MRTmin, cap });
      return {
        summary: [
          { l: 'UPr dipakai', v: f(UPr, 3), u: 'mm/th' },
          { l: 'StPr dipakai', v: f(StPr, 3), u: 'mm/th' },
          { l: 'MRT pada akhir Or', v: f(r.MRT), u: 'mm' },
          { l: 'Interval internal maks.', v: f(Omax, 1), u: 'tahun', s: 'batas ' + cap + ' th' }
        ],
        checks: [
          { l: 'MRT ≥ minimum Table 4.4', meas: f(r.MRT), lim: '≥ ' + f(MRTmin), u: 'mm', ok: r.MRT >= MRTmin, ref: 'Table 4.4' },
          { l: 'Or ≤ batas 6.4.2.2.1', meas: f(v.Or, 1), lim: '≤ ' + cap, u: 'tahun', ok: v.Or <= cap, ref: '6.4.2.2.1' }
        ],
        notes: ['Untuk area hasil scan MFL tanpa CP efektif, tebal untuk UPr adalah yang lebih kecil dari threshold MFL atau tebal minimum area korosi yang tidak direpair (Note 1).', 'Perbaikan non-las (coating, caulking) tidak boleh menaikkan RTip (4.4.5.6).']
      };
    }
  });

  add({
    id: 'BT-02', grp: 'BT', title: 'Bottom critical zone',
    refs: ['API 653 4.4.5.4', 'API 653 9.10.1.2'],
    params: ['Tebal minimum di critical zone', 'Tebal terukur di critical zone'],
    desc: 'Tanpa stress analysis, tebal minimum di critical zone = yang lebih kecil dari ½ tebal awal bottom (tanpa CA awal) atau 50% tmin course 1, tetapi tidak kurang dari 0.1 in.',
    fields: [
      { k: 'tOrig', l: 'Tebal awal plat bottom/annular', u: 'mm', def: 8 },
      { k: 'CA0', l: 'Corrosion allowance awal', u: 'mm', def: 1.5 },
      { k: 'tmin1', l: 'tmin course 1 (dari SH-01)', u: 'mm', def: 11.4 },
      { k: 't', l: 'Tebal terukur terkecil di critical zone', u: 'mm', def: 4.1 }
    ],
    compute(v) {
      const lim = Math.max(Math.min(0.5 * (v.tOrig - v.CA0), 0.5 * v.tmin1), 2.54);
      return {
        summary: [{ l: 'Tebal minimum critical zone', v: f(lim), u: 'mm' }],
        checks: [{ l: 'Tebal critical zone ≥ batas', meas: f(v.t), lim: '≥ ' + f(lim), u: 'mm', ok: v.t >= lim, ref: '4.4.5.4' }],
        notes: ['Critical zone: area bottom/annular di dalam shell sejauh 3 in dari sisi dalam shell (9.10.1.2).']
      };
    }
  });

  add({
    id: 'BT-03', grp: 'BT', title: 'Annular plate in-service (SG < 1)',
    refs: ['API 653 4.4.6.2', 'API 653 Table 4.5'],
    params: ['Tegangan course 1', 'Tebal annular minimum', 'Tebal annular terukur'],
    desc: 'Tegangan course 1 = 2.34 D (H − 1) / t (psi; D, H dalam ft, t dalam in). Tebal minimum dari Table 4.5 ditambah CA. Interpolasi diizinkan.',
    fields: [
      { k: 'D', l: 'Diameter D', u: 'm', def: 30, link: 'D' },
      { k: 'HL', l: 'Tinggi cairan maks.', u: 'm', def: 14.4, link: 'HL' },
      { k: 'G', l: 'Specific gravity', u: '–', def: 0.9, link: 'G' },
      { k: 't1', l: 'Tebal course 1 as-constructed', u: 'mm', def: 14 },
      { k: 'CA', l: 'CA s.d. inspeksi berikut', u: 'mm', def: 0.5 },
      { k: 'ta', l: 'Tebal annular terukur (min.)', u: 'mm', def: 5.2 }
    ],
    compute(v) {
      if (v.G >= 1) return { summary: [], checks: [{ l: 'G ≥ 1.0: gunakan API 650 Table 5.1a/5.1b (modul BT-04)', ok: null, ref: '4.4.6.3' }], notes: [] };
      const t1 = C.inch(v.t1);
      const s = 2.34 * C.ft(v.D) * (C.ft(v.HL) - 1) / t1;
      const r = C.annular653({ tShell: t1, stress: s });
      if (r.outOfTable) return { summary: [{ l: 'Tegangan course 1', v: Math.round(s).toLocaleString('en'), u: 'psi' }], checks: [{ l: 'Tegangan ≥ 32,400 psi: di luar Table 4.5, perlu stress analysis', ok: 'warn', ref: 'Table 4.5' }], notes: [] };
      const reqStep = C.mm(r.step) + v.CA, reqInt = C.mm(r.interp) + v.CA;
      return {
        summary: [
          { l: 'Tegangan course 1', v: Math.round(s).toLocaleString('en'), u: 'psi' },
          { l: 'Tebal min. (tabel langsung)', v: f(reqStep), u: 'mm', s: r.step + ' in + CA' },
          { l: 'Tebal min. (interpolasi)', v: f(reqInt), u: 'mm' }
        ],
        checks: [
          { l: 'Tebal annular ≥ Table 4.5 + CA (interpolasi)', meas: f(v.ta), lim: '≥ ' + f(reqInt), u: 'mm', ok: v.ta >= reqInt, ref: '4.4.6.2' },
          { l: 'Tebal annular ≥ Table 4.5 + CA (tanpa interpolasi, konservatif)', meas: f(v.ta), lim: '≥ ' + f(reqStep), u: 'mm', ok: v.ta >= reqStep ? true : 'warn', ref: 'Table 4.5' }
        ],
        notes: ['Nilai tabel mengasumsikan dukungan foundation seragam di seluruh lebar annular.']
      };
    }
  });

  add({
    id: 'BT-04', grp: 'BT', title: 'Annular plate desain (API 650)',
    refs: ['API 650 5.5.2', 'API 650 5.5.3', 'API 650 Table 5.1a'],
    params: ['Tegangan produk & hydrotest course 1', 'Tebal annular tb', 'Lebar radial minimum L'],
    desc: 'Tegangan produk = ((td − CA)/t terkorosi) Sd; hydrotest = (tt/t nominal) St. tb dari Table 5.1a (ambil yang lebih besar, produk + CA). L = 2 tb √(Fy / (2 γ G H)) ≥ 600 mm.',
    fields: [
      { k: 'D', l: 'Diameter D', u: 'm', def: 30, link: 'D' },
      { k: 'HL', l: 'Design liquid level H', u: 'm', def: 14.4, link: 'HL' },
      { k: 'G', l: 'Specific gravity', u: '–', def: 0.9, link: 'G' },
      { k: 'mat', l: 'Material course 1', type: 'sel', opts: matOpts650, def: 3 },
      { k: 't1', l: 'Tebal nominal course 1', u: 'mm', def: 14 },
      { k: 'CA', l: 'Corrosion allowance', u: 'mm', def: 1.5 },
      { k: 'Fy', l: 'Fy plat annular', u: 'MPa', def: 250 },
      { k: 'tb', l: 'Tebal annular terpasang', u: 'mm', def: 8 },
      { k: 'wid', l: 'Lebar radial terpasang (dalam shell)', u: 'mm', def: 650 }
    ],
    compute(v) {
      const { td, tt } = C.oneFoot650({ D: v.D, H: v.HL, G: v.G, Sd: v.mat.Sd, St: v.mat.St, CA: v.CA });
      const sP = (td - v.CA) / (v.t1 - v.CA) * v.mat.Sd;
      const sT = tt / v.t1 * v.mat.St;
      const lp = C.annular650Lookup(v.t1 - v.CA, sP);
      const lt = C.annular650Lookup(v.t1, sT);
      const checks = [];
      let req = null;
      if (!lp || !lt) checks.push({ l: 'Di luar Table 5.1a (t > 45 mm atau tegangan > 250 MPa): perlu analisis elastis', ok: 'warn', ref: '5.5.3' });
      else {
        req = Math.max(lp.tb + v.CA, lt.tb);
        checks.push({ l: 'tb terpasang ≥ tb syarat', meas: f(v.tb), lim: '≥ ' + f(req), u: 'mm', ok: v.tb >= req, ref: 'Table 5.1a' });
      }
      const Gc = Math.min(v.G, 1);
      const L = Math.max(2 * v.tb * Math.sqrt(v.Fy / (2 * (9.81 / 1000) * Gc * v.HL)), 600);
      checks.push({ l: 'Lebar radial ≥ L', meas: f(v.wid, 0), lim: '≥ ' + f(L, 0), u: 'mm', ok: v.wid >= L, ref: '5.5.2' });
      if (v.HL * v.G > 23) checks.push({ l: 'H × G > 23 m: Table 5.1a tidak berlaku', ok: 'warn', ref: '5.5.3' });
      return {
        summary: [
          { l: 'Tegangan produk course 1', v: f(sP, 0), u: 'MPa' },
          { l: 'Tegangan hydrotest course 1', v: f(sT, 0), u: 'MPa' },
          { l: 'tb syarat', v: req != null ? f(req, 1) : '–', u: 'mm' },
          { l: 'L minimum', v: f(L, 0), u: 'mm' }
        ],
        checks,
        notes: ['Annular butt-welded wajib bila course 1 memakai material Group IV–VI (5.5.1). Plat juga harus menonjol ≥ 50 mm di luar shell (5.4.2).']
      };
    }
  });

  add({
    id: 'BT-05', grp: 'BT', title: 'Proyeksi bottom di luar shell',
    refs: ['API 653 4.4.5.7', 'API 650 5.4.2'],
    params: ['Proyeksi dari permukaan luar shell', 'Proyeksi dari toe las shell-to-bottom', 'Tebal proyeksi di toe las'],
    desc: 'API 653: proyeksi di luar toe las luar ≥ 3/8 in (9.5 mm) dan tebal di toe las ≥ 0.1 in (2.54 mm). API 650 (baru): proyeksi dari permukaan luar shell ≥ 50 mm.',
    fields: [{ k: 'basis', l: 'Basis', type: 'sel', opts: [{ v: '653', l: 'API 653 — in-service' }, { v: '650', l: 'API 650 — konstruksi baru' }], def: 0 }],
    table: {
      k: 'loc', l: 'Titik pengukuran',
      cols: [{ k: 'loc', l: 'Lokasi', type: 'text', def: '' }, { k: 'ps', l: 'Proyeksi dari luar shell (mm)', def: '' }, { k: 'pt', l: 'Proyeksi dari toe las (mm)', def: '' }, { k: 'tp', l: 'Tebal di toe (mm)', def: '' }],
      rows: [{ loc: '0°', ps: 55, pt: 40, tp: 6.1 }, { loc: '90°', ps: 52, pt: 38, tp: 5.2 }, { loc: '180°', ps: 48, pt: 8, tp: 2.3 }, { loc: '270°', ps: 60, pt: 45, tp: 6.4 }]
    },
    compute(v, rows) {
      const checks = [];
      rows.forEach(r => {
        if (v.basis === '650') {
          if (num(r.ps)) checks.push({ l: `${r.loc}: proyeksi dari luar shell ≥ 50 mm`, meas: f(r.ps, 1), lim: '≥ 50', u: 'mm', ok: r.ps >= 50, ref: '650 5.4.2' });
        } else {
          if (num(r.pt)) checks.push({ l: `${r.loc}: proyeksi dari toe las ≥ 3/8 in`, meas: f(r.pt, 1), lim: '≥ 9.53', u: 'mm', ok: r.pt >= 9.525, ref: '653 4.4.5.7' });
          if (num(r.tp)) checks.push({ l: `${r.loc}: tebal di toe las ≥ 0.1 in`, meas: f(r.tp), lim: '≥ 2.54', u: 'mm', ok: r.tp >= 2.54, ref: '653 4.4.5.7' });
        }
      });
      return { summary: [], checks, notes: [] };
    }
  });

  /* ================= A · ROOF ================= */
  add({
    id: 'RF-01', grp: 'RF', title: 'Roof plate in-service',
    refs: ['API 653 4.2.1.2', 'API 650 5.10.2.2'],
    params: ['Tebal rata-rata per 100 in²', 'Lubang tembus', 'Laju korosi & sisa umur'],
    desc: 'Roof plate dengan tebal rata-rata < 0.09 in (2.29 mm) pada area 100 in² (≈ 254 × 254 mm) atau berlubang tembus harus diperbaiki atau diganti. Plat baru minimal 5 mm nominal (API 650).',
    table: {
      k: 'areas', l: 'Area pengukuran (rata-rata per 100 in²)',
      cols: [{ k: 'loc', l: 'Lokasi', type: 'text', def: '' }, { k: 't', l: 't rata-rata (mm)', def: '' }, { k: 'hole', l: 'Lubang tembus', type: 'sel', opts: yesNo, def: 0 }, { k: 'tPrev', l: 't sebelumnya (mm)', def: '' }, { k: 'yrs', l: 'Selang (th)', def: '' }],
      rows: [{ loc: 'Ring luar 0°', t: 4.2, hole: 0, tPrev: 4.6, yrs: 10 }, { loc: 'Ring luar 180°', t: 3.1, hole: 0, tPrev: 3.8, yrs: 10 }, { loc: 'Tengah', t: 4.7, hole: 0, tPrev: 4.9, yrs: 10 }, { loc: 'Dekat vent', t: 2.0, hole: 1, tPrev: '', yrs: '' }]
    },
    compute(v, rows) {
      const lim = 0.09 * 25.4;
      const checks = [], trows = [];
      rows.forEach(r => {
        if (!num(r.t)) return;
        const ok = r.t >= lim && !r.hole;
        checks.push({ l: `${r.loc}: t rata-rata ≥ 0.09 in & tanpa lubang`, meas: f(r.t) + (r.hole ? ' (lubang)' : ''), lim: '≥ ' + f(lim), u: 'mm', ok, ref: '653 4.2.1.2' });
        const CR = num(r.tPrev) && num(r.yrs) && r.yrs > 0 ? (r.tPrev - r.t) / r.yrs : null;
        const RL = CR > 0 ? (r.t - lim) / CR : null;
        trows.push([r.loc, f(r.t), num(CR) ? f(CR, 3) : '–', num(RL) ? f(Math.max(RL, 0), 1) : '–', { ok }]);
      });
      return { summary: [{ l: 'Batas tebal', v: f(lim), u: 'mm', s: '0.09 in' }], checks, table: { head: ['Lokasi', 't (mm)', 'CR (mm/th)', 'Sisa umur (th)', 'Status'], rows: trows }, notes: ['Periksa juga rafter, girder, kolom (out-of-plumb, korosi) per 4.2.2.1 dan sambungan frangible per 4.2.2.2.'] };
    }
  });

  add({
    id: 'RF-02', grp: 'RF', title: 'Self-supporting cone roof',
    refs: ['API 650 5.10.5.1'],
    params: ['Sudut cone θ (9.5°–37°)', 'Tebal nominal minimum', 'Tebal terkorosi ≤ 13 mm'],
    desc: 't = maks[ (2000 D / sin θ) √(B / 1000E) + CA ; (2000 D / sin θ) √(U / 1.33·1000E) + CA ; 5 mm ].',
    fields: [
      { k: 'D', l: 'Diameter D', u: 'm', def: 15, link: 'D' },
      { k: 'th', l: 'Sudut cone θ terhadap horizontal', u: '°', def: 9.5 },
      { k: 'B', l: 'B — kombinasi beban balanced snow', u: 'kPa', def: 2.2 },
      { k: 'U', l: 'U — kombinasi beban unbalanced snow', u: 'kPa', def: 2.2 },
      { k: 'E', l: 'Modulus elastisitas E (pada T maks.)', u: 'MPa', def: 199000 },
      { k: 'CA', l: 'Corrosion allowance', u: 'mm', def: 1 },
      { k: 't', l: 'Tebal terpasang / terukur', u: 'mm', def: 8 }
    ],
    compute(v) {
      const r = C.coneRoof650({ D: v.D, thetaDeg: v.th, B: v.B, U: v.U, E: v.E, CA: v.CA });
      return {
        summary: [{ l: 't dari B', v: f(r.tB), u: 'mm' }, { l: 't dari U', v: f(r.tU), u: 'mm' }, { l: 't syarat', v: f(r.t), u: 'mm' }],
        checks: [
          { l: 'Sudut 9.5° ≤ θ ≤ 37°', meas: f(v.th, 1), lim: '9.5 – 37', u: '°', ok: v.th >= 9.5 && v.th <= 37, ref: '5.10.5.1' },
          { l: 'Tebal ≥ t syarat', meas: f(v.t), lim: '≥ ' + f(r.t), u: 'mm', ok: v.t >= r.t, ref: '5.10.5.1' },
          { l: 'Tebal terkorosi ≤ 13 mm', meas: f(r.t - v.CA), lim: '≤ 13', u: 'mm', ok: r.t - v.CA <= 13 ? true : 'warn', ref: '5.10.5.1' }
        ],
        notes: ['B dan U adalah yang lebih besar dari kombinasi beban 5.2.2 (e)(1) dan (e)(2).']
      };
    }
  });

  add({
    id: 'RF-03', grp: 'RF', title: 'Self-supporting dome / umbrella roof',
    refs: ['API 650 5.10.6.1'],
    params: ['Radius dome 0.8D – 1.2D', 'Tebal nominal minimum', 'Tebal terkorosi ≤ 13 mm'],
    desc: 't = maks[ 4000 rr √(B / 1000E) + CA ; 4000 rr √(U / 1.33·1000E) + CA ; 5 mm ].',
    fields: [
      { k: 'D', l: 'Diameter D', u: 'm', def: 15, link: 'D' },
      { k: 'rr', l: 'Radius roof rr', u: 'm', def: 30 },
      { k: 'B', l: 'B — balanced snow', u: 'kPa', def: 2.2 },
      { k: 'U', l: 'U — unbalanced snow', u: 'kPa', def: 2.2 },
      { k: 'E', l: 'Modulus elastisitas E', u: 'MPa', def: 199000 },
      { k: 'CA', l: 'Corrosion allowance', u: 'mm', def: 1 },
      { k: 't', l: 'Tebal terpasang / terukur', u: 'mm', def: 14 }
    ],
    compute(v) {
      const r = C.domeRoof650({ rr: v.rr, B: v.B, U: v.U, E: v.E, CA: v.CA });
      return {
        summary: [{ l: 't dari B', v: f(r.tB), u: 'mm' }, { l: 't dari U', v: f(r.tU), u: 'mm' }, { l: 't syarat', v: f(r.t), u: 'mm' }],
        checks: [
          { l: '0.8D ≤ rr ≤ 1.2D', meas: f(v.rr), lim: f(0.8 * v.D) + ' – ' + f(1.2 * v.D), u: 'm', ok: v.rr >= 0.8 * v.D && v.rr <= 1.2 * v.D, ref: '5.10.6.1' },
          { l: 'Tebal ≥ t syarat', meas: f(v.t), lim: '≥ ' + f(r.t), u: 'mm', ok: v.t >= r.t, ref: '5.10.6.1' },
          { l: 'Tebal terkorosi ≤ 13 mm', meas: f(r.t - v.CA), lim: '≤ 13', u: 'mm', ok: r.t - v.CA <= 13 ? true : 'warn', ref: '5.10.6.1' }
        ],
        notes: []
      };
    }
  });

  /* ================= A · INTERVAL ================= */
  add({
    id: 'IN-01', grp: 'IN', title: 'Interval inspeksi external & UT',
    refs: ['API 653 6.3.1.2', 'API 653 6.3.2.1', 'API 653 6.3.3.2'],
    params: ['RCA (mils)', 'Laju korosi N (mpy)', 'Interval external', 'Interval UT shell'],
    desc: 'External: min(5 th, RCA/4N). UT: CR tidak diketahui → 5 th; diketahui → min(RCA/2N, 15 th). Routine in-service (visual dari tanah) maks. 1 bulan.',
    fields: [
      { k: 'tAct', l: 'Tebal shell terukur (course kritis)', u: 'mm', def: 7.1 },
      { k: 'tmin', l: 'tmin course tersebut', u: 'mm', def: 6.2 },
      { k: 'CR', l: 'Laju korosi (0 = tidak diketahui)', u: 'mm/th', def: 0.03 }
    ],
    compute(v) {
      const RCA = C.inch(v.tAct - v.tmin) * 1000, N = C.inch(v.CR) * 1000;
      const ext = C.externalInterval(RCA, N), ut = C.utInterval(RCA, N);
      return {
        summary: [{ l: 'RCA', v: f(RCA, 1), u: 'mils' }, { l: 'N', v: f(N, 2), u: 'mpy' }, { l: 'Interval external', v: f(Math.max(ext, 0), 1), u: 'tahun' }, { l: 'Interval UT', v: f(Math.max(ut, 0), 1), u: 'tahun' }],
        checks: [{ l: 'Tebal terukur ≥ tmin', meas: f(v.tAct), lim: '≥ ' + f(v.tmin), u: 'mm', ok: v.tAct >= v.tmin, ref: '4.3.3' }],
        notes: ['Inspeksi internal shell dapat menggantikan program UT eksternal bila intervalnya ≤ interval 6.3.3.2 b).']
      };
    }
  });

  add({
    id: 'IN-02', grp: 'IN', title: 'Interval inspeksi internal awal',
    refs: ['API 653 6.4.2.1.1', 'API 653 Table 6.1'],
    params: ['Kredit safeguard', 'Kredit CA bottom > 0.150 in', 'Interval awal maks. (20/30 th)'],
    desc: 'Interval awal 10 tahun ditambah kredit kumulatif Table 6.1. Maksimum 20 tahun tanpa RPB, 30 tahun dengan RPB.',
    fields: DATA.safeguards.map(s => ({ k: s.k, l: s.l + ' (+' + s.yrs + ' th)', type: 'sel', opts: yesNo, def: 0 })).concat([
      { k: 'CA', l: 'Corrosion allowance bottom', u: 'mm', def: 1.5 },
      { k: 'CR', l: 'Laju korosi bottom (0 = pakai 15 mpy)', u: 'mpy', def: 0 },
      { k: 'yr', l: 'Tahun mulai operasi', u: '', def: 2018, link: 'year' }
    ]),
    compute(v) {
      const credits = DATA.safeguards.reduce((a, s) => a + (v[s.k] ? s.yrs : 0), 0);
      const r = C.initialInternal({ credits, caIn: C.inch(v.CA), crMpy: v.CR, rpb: v.rpb });
      return {
        summary: [{ l: 'Kredit safeguard', v: credits, u: 'tahun' }, { l: 'Kredit CA', v: f(r.caCredit, 1), u: 'tahun' }, { l: 'Interval awal', v: f(r.yrs, 1), u: 'tahun', s: 'batas ' + r.cap + ' th' }, { l: 'Inspeksi internal pertama', v: num(v.yr) ? Math.floor(v.yr + r.yrs) : '–', u: '' }],
        checks: [{ l: 'Interval tidak melebihi batas', meas: f(r.raw, 1), lim: '≤ ' + r.cap, u: 'tahun', ok: r.raw <= r.cap ? true : null, ref: '6.4.2.1.1' }],
        notes: ['Alternatif: interval berbasis RBI per 6.4.2.1.2 / 6.4.2.2.2.']
      };
    }
  });

  /* ================= B · TOLERANSI ================= */
  const devModule = (o) => add({
    id: o.id, grp: o.grp, title: o.title, refs: o.refs, params: o.params, desc: o.desc,
    fields: [{ k: 'basis', l: 'Basis toleransi', type: 'sel', opts: basisOpts, def: 0 }],
    table: { k: 'pts', l: o.tl, cols: [{ k: 'id', l: 'Sambungan / lokasi', type: 'text', def: '' }, { k: 'd', l: 'Deviasi (mm)', def: '' }], rows: o.rows },
    compute(v, rows) {
      const lim = o.lim(v.basis);
      const pts = rows.filter(r => num(r.d));
      const checks = pts.map(r => ({ l: `${r.id}: |deviasi| ≤ batas`, meas: f(r.d, 1), lim: '≤ ' + f(lim.mm, 1), u: 'mm', ok: Math.abs(r.d) <= lim.mm + 1e-9, ref: lim.ref }));
      const st = C.stats(pts.map(r => Math.abs(r.d)));
      return {
        summary: [{ l: 'Batas', v: f(lim.mm, 1), u: 'mm', s: lim.txt }, { l: 'Deviasi maks.', v: f(st.max, 1), u: 'mm' }, { l: 'Titik melebihi', v: checks.filter(c => c.ok === false).length + ' / ' + checks.length, u: '' }],
        checks,
        chart: { type: 'bars', xLabel: 'Lokasi', yLabel: 'mm', cats: pts.map(r => r.id), series: [{ name: '|deviasi|', y: pts.map(r => Math.abs(r.d)), cls: 's1' }], hlines: [{ y: lim.mm, name: 'Batas', cls: 'lim' }] },
        notes: [o.note]
      };
    }
  });

  add({
    id: 'DT-01', grp: 'DT', title: 'Plumbness (kevertikalan)',
    refs: ['API 650 7.5.2', 'API 653 10.5.2'],
    params: ['Out-of-plumbness puncak vs dasar shell', 'Batas H/200 (API 650) atau H/100 maks. 5 in (API 653)'],
    desc: 'Simpangan horizontal puncak shell terhadap dasar shell. API 650: ≤ 1/200 tinggi total. API 653 (rekonstruksi): ≤ 1/100 tinggi, maks. 5 in (127 mm). Batas yang sama berlaku untuk kolom roof.',
    fields: [
      { k: 'basis', l: 'Basis toleransi', type: 'sel', opts: basisOpts, def: 0 },
      { k: 'obj', l: 'Objek', type: 'sel', opts: [{ v: 'shell', l: 'Shell' }, { v: 'col', l: 'Kolom roof / guide pole' }], def: 0 },
      { k: 'H', l: 'Tinggi total shell / kolom', u: 'm', def: 14.4, link: 'Hs' }
    ],
    table: {
      k: 'pts', l: 'Stasiun pengukuran keliling',
      cols: [{ k: 'id', l: 'Stasiun', type: 'text', def: '' }, { k: 'd', l: 'Simpangan puncak (mm)', def: '' }],
      rows: [['0°', 22], ['45°', 31], ['90°', 18], ['135°', -12], ['180°', -40], ['225°', -78], ['270°', -25], ['315°', 9]].map(([id, d]) => ({ id, d }))
    },
    compute(v, rows) {
      const Hmm = v.H * 1000;
      const lim = v.basis === '650' ? Hmm / 200 : Math.min(Hmm / 100, 127);
      const pts = rows.filter(r => num(r.d));
      const checks = pts.map(r => ({ l: `${r.id}: |simpangan| ≤ batas`, meas: f(r.d, 1), lim: '≤ ' + f(lim, 1), u: 'mm', ok: Math.abs(r.d) <= lim, ref: v.basis === '650' ? '650 7.5.2' : '653 10.5.2.1' }));
      const st = C.stats(pts.map(r => Math.abs(r.d)));
      return {
        summary: [{ l: 'Batas out-of-plumb', v: f(lim, 1), u: 'mm', s: v.basis === '650' ? 'H/200' : 'H/100, maks. 127 mm' }, { l: 'Simpangan maks.', v: f(st.max, 1), u: 'mm' }],
        checks,
        charts: [{ type: 'polar', title: 'Tampak atas — arah & besar simpangan puncak', labels: pts.map(r => r.id), angles: root.TKViz && root.TKViz.anglesFrom(pts.map(r => r.id)), values: pts.map(r => r.d), tol: lim, unit: 'mm', valueName: 'Simpangan (+ keluar)', center: 'H ' + f(v.H) + ' m' }],
        chart: { type: 'bars', xLabel: 'Stasiun', yLabel: 'mm', cats: pts.map(r => r.id), series: [{ name: 'Simpangan', y: pts.map(r => r.d), cls: 's1' }], hlines: [{ y: lim, name: '+batas', cls: 'lim' }, { y: -lim, name: '−batas', cls: 'lim' }] },
        notes: ['Out-of-plumbness per course juga tidak boleh melebihi toleransi flatness/waviness ASTM A6/A20/A480.', 'Untuk tangki IFR berlaku juga Annex H (H.4.1.1), ambil yang lebih ketat.', 'Ukur sebelum hydrotest (7.5.1 / 10.5.1.2).']
      };
    }
  });

  add({
    id: 'DT-02', grp: 'DT', title: 'Roundness (kebundaran)',
    refs: ['API 650 7.5.3', 'API 653 10.5.3 & Table 10.2'],
    params: ['Radius terukur vs radius nominal', 'Toleransi radius berdasarkan D', 'Elevasi pengukuran (0.3 m / lebih tinggi)'],
    desc: 'Radius diukur 0.3 m (1 ft) di atas las bottom-to-shell. Toleransi: D < 12 m ±13 mm; 12–45 m ±19 mm; 45–75 m ±25 mm; ≥ 75 m ±32 mm. API 653: di atas 1 ft boleh 3× toleransi.',
    fields: [
      { k: 'basis', l: 'Basis toleransi', type: 'sel', opts: basisOpts, def: 0 },
      { k: 'D', l: 'Diameter nominal D', u: 'm', def: 30, link: 'D' },
      { k: 'Rn', l: 'Radius nominal (0 = D/2)', u: 'mm', def: 0 },
      { k: 'el', l: 'Elevasi pengukuran di atas las bottom', u: 'm', def: 0.3 }
    ],
    table: {
      k: 'pts', l: 'Radius terukur per stasiun',
      cols: [{ k: 'id', l: 'Stasiun', type: 'text', def: '' }, { k: 'r', l: 'Radius (mm)', def: '' }],
      rows: [['0°', 15008], ['30°', 15012], ['60°', 14995], ['90°', 14987], ['120°', 14980], ['150°', 14992], ['180°', 15004], ['210°', 15021], ['240°', 15011], ['270°', 14998], ['300°', 15003], ['330°', 15009]].map(([id, r]) => ({ id, r }))
    },
    compute(v, rows) {
      const Rn = v.Rn > 0 ? v.Rn : v.D * 500;
      const t = C.roundTol(v.D);
      let tol = v.basis === '650' ? t.mm : t.inch * 25.4;
      const high = v.el > 0.3048 + 1e-6;
      if (high && v.basis === '653') tol *= 3;
      const pts = rows.filter(r => num(r.r));
      const dev = pts.map(r => r.r - Rn);
      const checks = pts.map((r, i) => ({ l: `${r.id}: |R − Rnom| ≤ toleransi`, meas: f(dev[i], 1), lim: '± ' + f(tol, 1), u: 'mm', ok: Math.abs(dev[i]) <= tol + 1e-9, ref: v.basis === '650' ? '650 7.5.3' : '653 Table 10.2' }));
      const notes = [];
      if (high && v.basis === '650') notes.push('⚠ API 650 hanya menetapkan toleransi pada 0.3 m di atas las bottom; nilai ini ditampilkan sebagai acuan.');
      const st = C.stats(pts.map(r => r.r));
      return {
        summary: [{ l: 'Radius nominal', v: f(Rn, 0), u: 'mm' }, { l: 'Toleransi', v: '± ' + f(tol, 1), u: 'mm', s: high && v.basis === '653' ? '3× Table 10.2' : '' }, { l: 'Ovality (Rmaks − Rmin)', v: f(st.max - st.min, 1), u: 'mm' }],
        checks,
        charts: [{ type: 'polar', title: 'Tampak atas — profil radius terukur', labels: pts.map(r => r.id), angles: root.TKViz && root.TKViz.anglesFrom(pts.map(r => r.id)), values: dev, tol, unit: 'mm', valueName: 'R − Rnom', center: 'R ' + f(Rn / 1000, 3) + ' m' }],
        chart: { type: 'bars', xLabel: 'Stasiun', yLabel: 'mm', cats: pts.map(r => r.id), series: [{ name: 'R − Rnom', y: dev, cls: 's1' }], hlines: [{ y: tol, name: '+tol', cls: 'lim' }, { y: -tol, name: '−tol', cls: 'lim' }] },
        notes: notes.concat(['Ovality akibat settlement dapat mengganggu floating roof (653 B.3.2.3).'])
      };
    }
  });

  devModule({
    id: 'DT-03', grp: 'DT', title: 'Peaking (sambungan vertikal)',
    refs: ['API 650 7.5.4 a)', 'API 653 10.5.4'],
    params: ['Deviasi di las vertikal', 'Sweep board horizontal 900 mm (36 in)'],
    desc: 'Diukur dengan sweep board horizontal 900 mm yang dibuat sesuai radius tangki. Batas 13 mm (API 650) atau 1/2 in = 12.7 mm (API 653).',
    tl: 'Pembacaan peaking per sambungan vertikal',
    rows: [['V1-2', 6], ['V1-5', 9], ['V2-3', 14], ['V2-8', 4], ['V3-1', 11]].map(([id, d]) => ({ id, d })),
    lim: b => b === '650' ? { mm: 13, txt: '13 mm', ref: '650 7.5.4 a)' } : { mm: 12.7, txt: '1/2 in', ref: '653 10.5.4' },
    note: 'Sweep board dibuat ke radius nominal (650) / radius luar sebenarnya (653).'
  });

  devModule({
    id: 'DT-04', grp: 'DT', title: 'Banding (sambungan horizontal)',
    refs: ['API 650 7.5.4 b)', 'API 653 10.5.5'],
    params: ['Deviasi di las horizontal', 'Sweep board vertikal lurus 900 mm (36 in)'],
    desc: 'Diukur dengan straight edge vertikal 900 mm. Batas 13 mm (API 650) atau 1 in = 25.4 mm (API 653).',
    tl: 'Pembacaan banding per sambungan horizontal',
    rows: [['H1 @0°', 8], ['H1 @90°', 12], ['H2 @0°', 15], ['H2 @180°', 6], ['H3 @270°', 10]].map(([id, d]) => ({ id, d })),
    lim: b => b === '650' ? { mm: 13, txt: '13 mm', ref: '650 7.5.4 b)' } : { mm: 25.4, txt: '1 in', ref: '653 10.5.5' },
    note: 'Flat spot pada bidang vertikal dibatasi toleransi flatness & waviness plat (650 7.5.4 c).'
  });

  add({
    id: 'WD-01', grp: 'WD', title: 'Misalignment sambungan vertikal',
    refs: ['API 650 7.2.3.1', 'API 653 10.4.4.1'],
    params: ['Tebal plat', 'Misalignment terukur', 'Batas 10% t (maks. 3 mm) atau 1.5 mm'],
    desc: 'Plat > 16 mm: misalignment ≤ 10% t, maks. 3 mm (1/8 in). Plat ≤ 16 mm: ≤ 1.5 mm (1/16 in).',
    fields: [{ k: 'basis', l: 'Basis', type: 'sel', opts: basisOpts, def: 0 }],
    table: {
      k: 'pts', l: 'Sambungan vertikal',
      cols: [{ k: 'id', l: 'Sambungan', type: 'text', def: '' }, { k: 't', l: 't plat (mm)', def: '' }, { k: 'm', l: 'Misalignment (mm)', def: '' }],
      rows: [{ id: 'V1-1', t: 20, m: 1.8 }, { id: 'V1-2', t: 20, m: 2.4 }, { id: 'V3-1', t: 10, m: 1.2 }, { id: 'V5-4', t: 8, m: 1.9 }]
    },
    compute(v, rows) {
      const checks = rows.filter(r => num(r.t) && num(r.m)).map(r => {
        const lim = v.basis === '650' ? C.misalignVert(r.t) : (r.t > 15.875 ? Math.min(0.1 * r.t, 3.175) : 1.5875);
        return { l: `${r.id} (t ${f(r.t, 1)}): misalignment ≤ batas`, meas: f(r.m, 1), lim: '≤ ' + f(lim, 2), u: 'mm', ok: r.m <= lim + 1e-9, ref: v.basis === '650' ? '650 7.2.3.1' : '653 10.4.4.1' };
      });
      return { summary: [], checks, notes: [] };
    }
  });

  add({
    id: 'WD-02', grp: 'WD', title: 'Projection sambungan horizontal',
    refs: ['API 650 7.2.3.2', 'API 653 10.4.4.2'],
    params: ['Tebal plat atas', 'Projection plat atas terhadap plat bawah', 'Batas 20% t (maks. 3 mm) atau 1.5 mm'],
    desc: 'Plat atas tidak boleh menonjol melewati muka plat bawah lebih dari 20% tebal plat atas, maks. 3 mm (1/8 in). Untuk plat atas < 8 mm (5/16 in): maks. 1.5 mm (1/16 in).',
    fields: [{ k: 'basis', l: 'Basis', type: 'sel', opts: basisOpts, def: 0 }],
    table: {
      k: 'pts', l: 'Sambungan horizontal',
      cols: [{ k: 'id', l: 'Sambungan / lokasi', type: 'text', def: '' }, { k: 't', l: 't plat atas (mm)', def: '' }, { k: 'p', l: 'Projection (mm)', def: '' }],
      rows: [{ id: 'H1 @0°', t: 12, p: 2.1 }, { id: 'H2 @90°', t: 10, p: 2.4 }, { id: 'H4 @180°', t: 6, p: 1.8 }, { id: 'H5 @270°', t: 8, p: 1.2 }]
    },
    compute(v, rows) {
      const checks = rows.filter(r => num(r.t) && num(r.p)).map(r => {
        const lim = v.basis === '650' ? C.projHoriz(r.t) : (r.t < 7.9375 ? 1.5875 : Math.min(0.2 * r.t, 3.175));
        return { l: `${r.id} (t atas ${f(r.t, 1)}): projection ≤ batas`, meas: f(r.p, 1), lim: '≤ ' + f(lim, 2), u: 'mm', ok: r.p <= lim + 1e-9, ref: v.basis === '650' ? '650 7.2.3.2' : '653 10.4.4.2' };
      });
      return { summary: [], checks, notes: ['Sisi dalam course atas tidak boleh menonjol melewati sisi dalam course bawah (650 5.6.1.3). Plat atas yang > 3 mm lebih tebal dari plat bawah butuh taper 4:1 (7.2.3.3).'] };
    }
  });

  add({
    id: 'WD-03', grp: 'WD', title: 'Weld reinforcement & undercut',
    refs: ['API 650 8.5.2 b)', 'API 650 8.5.2 d)'],
    params: ['Tinggi reinforcement butt weld', 'Kedalaman undercut'],
    desc: 'Reinforcement maks.: t ≤ 13 mm → V 2.5 / H 3 mm; 13–25 mm → V 3 / H 5 mm; > 25 mm → V 5 / H 6 mm. Undercut maks.: 0.4 mm (vertikal, nozzle, shell-to-bottom dalam), 0.8 mm (horizontal, annular).',
    table: {
      k: 'pts', l: 'Sambungan las',
      cols: [{ k: 'id', l: 'Sambungan', type: 'text', def: '' }, { k: 'o', l: 'Orientasi', type: 'sel', opts: [{ v: 'V', l: 'Vertikal' }, { v: 'H', l: 'Horizontal' }], def: 0 }, { k: 't', l: 't plat (mm)', def: '' }, { k: 'r', l: 'Reinforcement (mm)', def: '' }, { k: 'u', l: 'Undercut (mm)', def: '' }],
      rows: [{ id: 'V1-1', o: 0, t: 14, r: 2.6, u: 0.3 }, { id: 'H1-2', o: 1, t: 12, r: 3.4, u: 0.6 }, { id: 'V2-4', o: 0, t: 10, r: 1.8, u: 0.5 }]
    },
    compute(v, rows) {
      const checks = [];
      rows.forEach(r => {
        const H = r.o === 'H';
        if (num(r.t) && num(r.r)) { const lim = C.weldReinf(r.t, H); checks.push({ l: `${r.id}: reinforcement ≤ batas`, meas: f(r.r, 1), lim: '≤ ' + f(lim, 1), u: 'mm', ok: r.r <= lim, ref: '650 8.5.2 d)' }); }
        if (num(r.u)) { const lim = H ? 0.8 : 0.4; checks.push({ l: `${r.id}: undercut ≤ batas`, meas: f(r.u, 1), lim: '≤ ' + f(lim, 1), u: 'mm', ok: r.u <= lim, ref: '650 8.5.2 b)' }); }
      });
      return { summary: [], checks, notes: ['Porositas permukaan: maks. 1 cluster per 100 mm, diameter cluster ≤ 2.5 mm (8.5.2 c).'] };
    }
  });

  add({
    id: 'FD-01', grp: 'FD', title: 'Kerataan foundation / ringwall',
    refs: ['API 650 7.5.5.2', 'API 653 10.5.6.2'],
    params: ['Deviasi dari elevasi rata-rata (total keliling)', 'Deviasi lokal per 9 m (ringwall) / 3 m (tanpa ringwall)'],
    desc: 'Ringwall: ±3 mm dalam setiap 9 m keliling dan ±6 mm total dari rata-rata. Tanpa ringwall: ±3 mm per 3 m dan ±13 mm total. (API 653 dalam in: 1/8, 1/4, 1/2 in.)',
    fields: [
      { k: 'basis', l: 'Basis', type: 'sel', opts: basisOpts, def: 0 },
      { k: 'rw', l: 'Jenis foundation', type: 'sel', opts: [{ v: true, l: 'Concrete ringwall' }, { v: false, l: 'Tanpa ringwall' }], def: 0 },
      { k: 'D', l: 'Diameter D', u: 'm', def: 30, link: 'D' }
    ],
    table: {
      k: 'pts', l: 'Elevasi titik berjarak sama di keliling (mulai 0°)',
      cols: [{ k: 'e', l: 'Elevasi (mm)', def: '' }],
      rows: [0, 2, 3, 1, -2, -4, -3, 0, 2, 4, 3, 1].map(e => ({ e }))
    },
    compute(v, rows) {
      const e = rows.map(r => r.e).filter(num);
      const n = e.length;
      const circ = Math.PI * v.D;
      const sp = circ / n;
      const inch = v.basis === '653';
      const totLim = v.rw ? (inch ? 6.35 : 6) : (inch ? 12.7 : 13);
      const locLim = inch ? 3.175 : 3;
      const win = v.rw ? 9 : 3;
      const avg = e.reduce((a, b) => a + b, 0) / n;
      const dev = e.map(x => x - avg);
      const checks = [{ l: 'Deviasi maks. dari rata-rata (total keliling)', meas: f(Math.max(...dev.map(Math.abs)), 1), lim: '± ' + f(totLim, 2), u: 'mm', ok: Math.max(...dev.map(Math.abs)) <= totLim, ref: inch ? '653 10.5.6.2' : '650 7.5.5.2' }];
      // jendela busur: titik-titik dalam panjang win
      const k = Math.max(1, Math.floor(win / sp));
      let worst = 0, at = 0;
      if (k >= 1) for (let i = 0; i < n; i++) {
        const w = []; for (let j = 0; j <= k; j++) w.push(e[(i + j) % n]);
        const m = w.reduce((a, b) => a + b, 0) / w.length;
        const d = Math.max(...w.map(x => Math.abs(x - m)));
        if (d > worst) { worst = d; at = i; }
      }
      if (sp > win) checks.push({ l: `Jarak titik (${f(sp, 2)} m) > ${win} m: tambah titik ukur agar deviasi lokal dapat dinilai`, ok: 'warn', ref: '' });
      else checks.push({ l: `Deviasi lokal dalam setiap ${win} m keliling`, meas: f(worst, 1), lim: '± ' + f(locLim, 2), u: 'mm', ok: worst <= locLim, ref: inch ? '653 10.5.6.2' : '650 7.5.5.2' });
      return {
        summary: [{ l: 'Elevasi rata-rata', v: f(avg, 1), u: 'mm' }, { l: 'Jarak antar titik', v: f(sp, 2), u: 'm' }, { l: 'Deviasi lokal terbesar', v: f(worst, 1), u: 'mm', s: 'mulai titik ' + (at + 1) }],
        checks,
        charts: [{ type: 'polar', title: 'Tampak atas — elevasi foundation terhadap rata-rata', labels: e.map((_, i) => i + 1), values: dev, tol: totLim, unit: 'mm', valueName: 'Deviasi elevasi', center: 'rata-rata' }],
        chart: { type: 'line', xLabel: 'Titik', yLabel: 'mm dari rata-rata', x: e.map((_, i) => i + 1), series: [{ name: 'Deviasi', y: dev, cls: 's1' }], hlines: [{ y: totLim, name: '+batas', cls: 'lim' }, { y: -totLim, name: '−batas', cls: 'lim' }] },
        notes: ['Deviasi lokal dihitung sebagai simpangan terbesar terhadap rata-rata titik-titik di dalam jendela busur yang sama (interpretasi "level within ±3 mm in any 9 m").', 'Untuk foundation miring, bandingkan selisih elevasi aktual dengan selisih terhitung dari titik tertinggi (7.5.5.3 / 10.5.6.3).']
      };
    }
  });

  /* ================= C · SETTLEMENT ================= */
  const YEfields = [
    { k: 'Y', l: 'Yield strength shell Y', u: 'psi', def: 30000 },
    { k: 'E', l: 'Modulus Young E', u: 'psi', def: 29000000 }
  ];

  add({
    id: 'ST-01', grp: 'ST', title: 'Shell settlement (cosine fit)',
    refs: ['API 653 B.2.2.4', 'API 653 B.3.2.1', 'Figure B.1 / B.3'],
    params: ['Uniform settlement', 'Rigid tilt (kurva cosinus, R² ≥ 0.9)', 'Out-of-plane Si', 'Smax izin'],
    desc: 'Elevasi keliling di-fit dengan Elev = a + b cos(θ + c). Si = Ui − ½(Ui−k + Ui+k). Smax = L² Y 11 / (2 E H) (ft). Jarak titik ≤ 32 ft (9.75 m), minimal 8 titik.',
    fields: [
      { k: 'D', l: 'Diameter D', u: 'm', def: 30, link: 'D' },
      { k: 'H', l: 'Tinggi tangki H', u: 'm', def: 14.4, link: 'Hs' },
      ...YEfields,
      { k: 'k', l: 'Langkah titik untuk Si (1 = semua titik)', u: '', def: 1 }
    ],
    table: {
      k: 'pts', l: 'Elevasi shell berjarak sama (mulai 0°, searah jarum jam)',
      cols: [{ k: 'e', l: 'Elevasi (mm)', def: '' }],
      rows: [0, -8, -19, -31, -42, -50, -55, -54, -47, -38, -25, -9].map(e => ({ e: e - 12 }))
    },
    compute(v, rows) {
      const elev = rows.map(r => r.e).filter(num);
      const n = elev.length;
      if (n < 4) return { summary: [], checks: [{ l: 'Masukkan minimal 8 titik', ok: false }], notes: [] };
      const r = C.settlementCosine({ elev, D: v.D, H: v.H, Y: v.Y, E: v.E, k: v.k || 1 });
      const spacing = Math.PI * v.D / n;
      const checks = [
        { l: 'Jumlah titik ≥ 8', meas: n, lim: '≥ 8', u: 'titik', ok: n >= 8, ref: 'Fig. B.1' },
        { l: 'Jarak antar titik ≤ 32 ft (9.75 m)', meas: f(spacing * (v.k || 1), 2), lim: '≤ 9.75', u: 'm', ok: spacing * (v.k || 1) <= 9.754, ref: 'B.2.2.4 Note' },
        { l: 'R² kurva cosinus ≥ 0.9 (tilt plane valid)', meas: f(r.fit.R2, 3), lim: '≥ 0.90', u: '', ok: r.fit.R2 >= 0.9 ? true : 'warn', ref: 'B.2.2.4 e)' }
      ];
      const maxS = Math.max(...r.S.map(Math.abs));
      checks.push({ l: '|Si| maks. ≤ Smax', meas: f(maxS, 1), lim: '≤ ' + f(r.Smax, 1), u: 'mm', ok: maxS <= r.Smax, ref: 'B.3.2.1' });
      const theta = elev.map((_, i) => 360 * i / n);
      return {
        summary: [
          { l: 'Uniform settlement (titik terendah)', v: f(r.uniform, 1), u: 'mm' },
          { l: 'Amplitudo tilt b', v: f(r.fit.b, 1), u: 'mm' },
          { l: 'R²', v: f(r.fit.R2, 3), u: '' },
          { l: 'Smax izin', v: f(r.Smax, 1), u: 'mm', s: f(r.SmaxIn, 2) + ' in' }
        ],
        checks,
        table: { head: ['Titik', 'θ (°)', 'Elevasi', 'Prediksi cos', 'Ui', 'Si', 'Status'], rows: elev.map((e, i) => [i + 1, f(theta[i], 0), f(e, 1), f(r.fit.pred[i], 1), f(r.U[i], 1), f(r.S[i], 1), { ok: Math.abs(r.S[i]) <= r.Smax }]) },
        charts: [{ type: 'polar', title: 'Tampak atas — out-of-plane settlement Si', labels: theta.map(t => f(t, 0) + '°'), angles: theta, values: r.S, tol: r.Smax, unit: 'mm', valueName: 'Si', center: 'bidang tilt' }],
        chart: { type: 'line', xLabel: 'θ (°)', yLabel: 'Elevasi (mm)', x: theta, series: [{ name: 'Terukur', y: elev, cls: 's1' }, { name: 'Cosine fit', y: r.fit.pred, cls: 's2' }] },
        notes: ['Bila R² < 0.9 atau Smax terlampaui, gunakan metode settlement arc (ST-02) atau analisis lebih rinci (B.3.2.4).', 'Kriteria ini tidak mencakup ridge/perubahan elevasi tajam, nozzle rendah, atau pola lipat pada cone roof dengan kolom.']
      };
    }
  });

  add({
    id: 'ST-02', grp: 'ST', title: 'Out-of-plane settlement (settlement arc)',
    refs: ['API 653 B.2.2.5', 'API 653 B.3.2.2'],
    params: ['Settlement arc Sarc', 'Out-of-plane Si', 'Faktor K (open top / fixed roof)', 'Smax = min(K·Sarc·(D/H)·(Y/E), 4 in)'],
    desc: 'Dipakai bila tilt plane tidak terdefinisi baik atau Smax B.3.2.1 terlampaui. Untuk pola lipat (fold) gunakan Sarc = 50% keliling.',
    fields: [
      { k: 'D', l: 'Diameter D', u: 'm', def: 30, link: 'D' },
      { k: 'H', l: 'Tinggi tangki H', u: 'm', def: 14.4, link: 'Hs' },
      { k: 'roof', l: 'Jenis tangki', type: 'sel', opts: [{ v: 'fixed', l: 'Fixed roof' }, { v: 'open', l: 'Open top (floating roof)' }], def: 0, link: 'roofType' },
      ...YEfields
    ],
    table: {
      k: 'arcs', l: 'Settlement arc',
      cols: [{ k: 'id', l: 'Arc', type: 'text', def: '' }, { k: 'sarc', l: 'Sarc (m)', def: '' }, { k: 'si', l: 'Si (mm)', def: '' }],
      rows: [{ id: 'Arc 3–7', sarc: 31, si: 18 }, { id: 'Arc 9–12', sarc: 23, si: 11 }]
    },
    compute(v, rows) {
      const checks = [], trows = [];
      rows.filter(r => num(r.sarc) && num(r.si)).forEach(r => {
        const a = C.settlementArc({ Sarc: r.sarc, D: v.D, H: v.H, Y: v.Y, E: v.E, roof: v.roof });
        if (a.na) { checks.push({ l: `${r.id}: D di luar jangkauan tabel K — perlu analisis rinci`, ok: 'warn', ref: 'B.3.2.2' }); return; }
        const ok = Math.abs(r.si) <= a.Smax;
        checks.push({ l: `${r.id}: |Si| ≤ Smax`, meas: f(r.si, 1), lim: '≤ ' + f(a.Smax, 1), u: 'mm', ok, ref: 'B.3.2.2' });
        trows.push([r.id, f(r.sarc, 2), a.K, f(a.Smax, 1), f(r.si, 1), { ok }]);
      });
      return { summary: [], checks, table: { head: ['Arc', 'Sarc (m)', 'K', 'Smax (mm)', 'Si (mm)', 'Status'], rows: trows }, notes: ['Berlaku untuk tangki baja karbon & stainless API 650 dalam rentang diameter tabel K.'] };
    }
  });

  add({
    id: 'ST-03', grp: 'ST', title: 'Edge settlement',
    refs: ['API 653 B.2.3', 'API 653 B.3.4', 'Figure B.11 / B.12'],
    params: ['Radius area settle R', 'Settlement B', 'Bew (lap weld ∥ shell) / Be (tanpa las, butt, lap ⟂ shell) / Bα', 'Batas 75% untuk MT/PT'],
    desc: 'Bα = Be − (Be − Bew) sin α, α = sudut las terhadap garis sumbu tangki. B ≤ 75% batas: boleh kembali beroperasi. 75–100%: las diperiksa visual + MT/PT. > batas: perbaikan atau analisis rinci.',
    fields: [{ k: 'D', l: 'Diameter D', u: 'm', def: 30, link: 'D' }],
    table: {
      k: 'pts', l: 'Area edge settlement',
      cols: [
        { k: 'id', l: 'Lokasi', type: 'text', def: '' },
        { k: 'R', l: 'R (m)', def: '' },
        { k: 'B', l: 'B (mm)', def: '' },
        { k: 'w', l: 'Las di area', type: 'sel', opts: [{ v: 'be', l: 'Tanpa las / butt / lap ⟂ shell (Be)' }, { v: 'bew', l: 'Lap ∥ shell (Bew)' }, { v: 'a', l: 'Lap bersudut α' }], def: 0 },
        { k: 'a', l: 'α (°)', def: '' }
      ],
      rows: [{ id: '30°', R: 0.9, B: 38, w: 1, a: '' }, { id: '150°', R: 1.2, B: 62, w: 0, a: '' }, { id: '240°', R: 1.0, B: 70, w: 2, a: 45 }]
    },
    compute(v, rows) {
      const checks = [], trows = [], notes = new Set();
      rows.filter(r => num(r.R) && num(r.B)).forEach(r => {
        const e = C.edgeSettlement({ D: v.D, R: r.R, alphaDeg: r.w === 'a' ? r.a : 0 });
        e.flags.forEach(x => notes.add(x));
        const allowIn = r.w === 'bew' ? e.BewIn : r.w === 'be' ? e.BeIn : e.BalphaIn;
        const allow = allowIn * 25.4;
        const ratio = r.B / allow;
        const ok = ratio <= 0.75 ? true : ratio <= 1 ? 'warn' : false;
        checks.push({ l: `${r.id}: B ≤ batas ${r.w === 'bew' ? 'Bew' : r.w === 'be' ? 'Be' : 'Bα'}${ok === 'warn' ? ' (≥ 75%: MT/PT)' : ''}`, meas: f(r.B, 1), lim: '≤ ' + f(allow, 1), u: 'mm', ok, ref: 'B.3.4' });
        trows.push([r.id, f(r.R, 2), f(r.B, 1), f(e.BewIn * 25.4, 1), f(e.BeIn * 25.4, 1), f(allow, 1), f(ratio * 100, 0) + '%', { ok }]);
      });
      return {
        summary: [], checks,
        table: { head: ['Lokasi', 'R (m)', 'B (mm)', 'Bew (mm)', 'Be (mm)', 'Batas (mm)', 'B/batas', 'Status'], rows: trows },
        notes: [...notes, 'Kurva Bew/Be didigitasi dari Figure B.11/B.12 dan diinterpolasi linier terhadap D; verifikasi pada grafik asli bila hasil mendekati batas.', 'Ukur B dari proyeksi bottom yang tidak settle (bukan dari garis level) untuk bottom cone-up/down (Figure B.7).']
      };
    }
  });

  add({
    id: 'ST-04', grp: 'ST', title: 'Bulge / depresi bottom',
    refs: ['API 653 B.3.3', 'Figure B.10'],
    params: ['Radius lingkaran dalam R', 'Tinggi bulge / kedalaman depresi B', 'BB = 0.37 R'],
    desc: 'BB (in) = 0.37 R (ft), untuk bottom dengan lap weld single-pass. Untuk depresi parsial di tepi gunakan R ≤ 2R pada Figure B.8.',
    table: {
      k: 'pts', l: 'Bulge / depresi',
      cols: [{ k: 'id', l: 'Lokasi', type: 'text', def: '' }, { k: 'R', l: 'R (m)', def: '' }, { k: 'B', l: 'B (mm)', def: '' }],
      rows: [{ id: 'Bulge dekat sump', R: 1.5, B: 42 }, { id: 'Depresi 120°', R: 2.4, B: 95 }]
    },
    compute(v, rows) {
      const checks = rows.filter(r => num(r.R) && num(r.B)).map(r => {
        const b = C.bulge(r.R);
        return { l: `${r.id}: B ≤ 0.37R`, meas: f(r.B, 1), lim: '≤ ' + f(b.BB, 1), u: 'mm', ok: r.B <= b.BB, ref: 'B.3.3' };
      });
      return { summary: [], checks, notes: ['Pertimbangkan juga rongga di bawah plat dan kualitas lap weld (B.2.5.2).'] };
    }
  });

  add({
    id: 'ST-05', grp: 'ST', title: 'Settlement saat hydrotest (tangki baru)',
    refs: ['API 650 7.3.7.7', 'API 650 7.3.7.2'],
    params: ['Settlement diferensial per 10 m keliling', 'Settlement seragam'],
    desc: 'Settlement diferensial > 13 mm per 10 m keliling atau settlement seragam > 50 mm dilaporkan ke Purchaser, dan pengisian dihentikan sampai disetujui.',
    fields: [{ k: 'D', l: 'Diameter D', u: 'm', def: 30, link: 'D' }],
    table: {
      k: 'pts', l: 'Settlement kumulatif per titik (mm, positif = turun)',
      cols: [{ k: 's', l: 'Settlement (mm)', def: '' }],
      rows: [12, 14, 17, 21, 24, 22, 19, 16, 14, 13, 12, 11].map(s => ({ s }))
    },
    compute(v, rows) {
      const s = rows.map(r => r.s).filter(num);
      const n = s.length, sp = Math.PI * v.D / n;
      const lim = 13 * sp / 10;
      const checks = [{ l: 'Jarak titik ≤ 10 m', meas: f(sp, 2), lim: '≤ 10', u: 'm', ok: sp <= 10, ref: '7.3.7.2' }];
      let worst = 0;
      for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs(s[i] - s[(i + 1) % n]));
      checks.push({ l: 'Diferensial antar titik bersebelahan ≤ 13 mm × (jarak/10 m)', meas: f(worst, 1), lim: '≤ ' + f(lim, 1), u: 'mm', ok: worst <= lim ? true : 'warn', ref: '7.3.7.7' });
      const uni = Math.min(...s);
      checks.push({ l: 'Settlement seragam ≤ 50 mm', meas: f(uni, 1), lim: '≤ 50', u: 'mm', ok: uni <= 50 ? true : 'warn', ref: '7.3.7.7' });
      const avg = s.reduce((a, b) => a + b, 0) / n;
      return { summary: [{ l: 'Jarak titik', v: f(sp, 2), u: 'm' }, { l: 'Settlement maks.', v: f(Math.max(...s), 1), u: 'mm' }], checks, charts: [{ type: 'polar', title: 'Tampak atas — settlement terhadap rata-rata (+ turun lebih dalam)', labels: s.map((_, i) => i + 1), values: s.map(x => x - avg), unit: 'mm', valueName: 'Settlement − rata-rata', center: 'rata-rata ' + f(avg, 1) + ' mm' }], notes: ['Nilai di luar batas bukan otomatis ditolak; dilaporkan untuk dievaluasi Purchaser.'] };
    }
  });

  root.TKModules = { CATS, M, f };
})(typeof window !== 'undefined' ? window : globalThis);
