/* Toolkit Tangki — halaman Laporan: pratinjau siap cetak (PDF lewat dialog cetak browser) dan ekspor Excel (.xlsx). */
(function () {
  const A = window.TKApp;
  const $ = (s, el = document) => el.querySelector(s);
  const { esc, f } = A;
  const today = () => new Date().toISOString().slice(0, 10);

  const meta = () => {
    const S = A.S;
    S.report = Object.assign({ no: '', date: today(), insp: '', chk: '', appr: '', client: '', scope: '', inputs: true, charts: true, notes: '' }, S.report || {});
    return S.report;
  };

  /* ---------- data per modul ---------- */
  function fieldsList(m) {
    return (m.fields || []).map(fd => {
      const raw = A.fieldRaw(m, fd);
      const val = fd.type === 'sel' ? (fd.opts[raw] || fd.opts[fd.def]).l : raw;
      return { l: fd.l, v: val, u: fd.u || '', linked: A.isLinked(m, fd) };
    });
  }
  function inputTable(m) {
    if (!m.table) return null;
    const head = m.table.cols.map(c => c.l);
    const rows = A.rowsRaw(m).map(r => m.table.cols.map(c => {
      const x = r[c.k];
      if (c.type === 'sel') return (c.opts[x === '' || x == null ? c.def : x] || c.opts[0]).l;
      return x == null ? '' : x;
    })).filter(row => row.some(x => x !== '' && x != null));
    return { title: m.table.l, head, rows };
  }
  function selected(scope) {
    const S = A.S;
    const all = A.M.map(m => ({ m, r: A.run(m) }));
    if (scope === 'issues') return all.filter(x => x.r.status === 'fail' || x.r.status === 'warn');
    if (scope === 'filled') return all.filter(x => S.mods[x.m.id] && Object.keys(S.mods[x.m.id]).length);
    return all;
  }
  const defaultScope = () => Object.keys(A.S.mods || {}).some(k => Object.keys(A.S.mods[k] || {}).length) ? 'filled' : 'all';

  /* ---------- tampilan ---------- */
  function render(main) {
    const R = meta();
    if (!R.scope) R.scope = defaultScope();
    const t = A.S.tank;
    const fld = (k, l, type = 'text') => `<label class="fld"><span class="fl">${l}</span><input id="rp-${k}" data-rk="${k}" type="${type}" value="${esc(R[k])}"></label>`;
    main.innerHTML = `
      <header class="page-h no-print"><p class="eyebrow">Output</p><h1>Laporan &amp; Ekspor</h1>
        <p class="lead">Atur identitas laporan dan modul yang dimasukkan, lalu cetak ke PDF atau unduh Excel. Pratinjau di bawah persis yang akan tercetak.</p></header>
      <div class="card no-print rp-set">
        <div class="form-grid">
          ${fld('no', 'No. laporan')}${fld('date', 'Tanggal inspeksi', 'date')}
          ${fld('client', 'Perusahaan / klien')}${fld('insp', 'Dibuat oleh (inspector)')}
          ${fld('chk', 'Diperiksa oleh')}${fld('appr', 'Disetujui oleh')}
          <label class="fld"><span class="fl">Modul yang dimasukkan</span><select id="rp-scope" data-rk="scope">
            <option value="all" ${R.scope === 'all' ? 'selected' : ''}>Semua modul (${A.M.length})</option>
            <option value="filled" ${R.scope === 'filled' ? 'selected' : ''}>Hanya modul yang sudah diisi</option>
            <option value="issues" ${R.scope === 'issues' ? 'selected' : ''}>Hanya yang perlu perhatian (NG / Cek)</option></select></label>
          <div class="fld rp-opts"><span class="fl">Isi tambahan</span>
            <label class="chk"><input type="checkbox" id="rp-inputs" data-rk="inputs" ${R.inputs ? 'checked' : ''}> Data input</label>
            <label class="chk"><input type="checkbox" id="rp-charts" data-rk="charts" ${R.charts ? 'checked' : ''}> Gambar &amp; grafik</label></div>
        </div>
        <label class="fld"><span class="fl">Kesimpulan / rekomendasi umum</span><textarea id="rp-notes" data-rk="notes" rows="3">${esc(R.notes)}</textarea></label>
        <div class="row-btns">
          <button class="btn" id="rp-pdf">Cetak / simpan PDF</button>
          <button class="btn" id="rp-xlsx">Unduh Excel (.xlsx)</button>
          <span class="muted small" id="rp-msg">${A.inFrame ? 'Cetak dan unduhan tidak tersedia di pratinjau ini. Buka aplikasi di browser (mis. GitHub Pages) untuk mengekspor.' : 'PDF: pada dialog cetak pilih tujuan "Save as PDF", ukuran A4.'}</span>
        </div>
      </div>
      <article class="report-doc" id="rp-doc"></article>`;
    const redraw = () => { $('#rp-doc').innerHTML = docHtml(); };
    main.querySelectorAll('[data-rk]').forEach(el => el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
      R[el.dataset.rk] = el.type === 'checkbox' ? el.checked : el.value;
      A.save(); redraw();
    }));
    $('#rp-pdf').onclick = () => { if (A.inFrame) return A.toast('Cetak tidak tersedia di pratinjau ini.'); window.print(); };
    $('#rp-xlsx').onclick = exportXlsx;
    redraw();
  }

  function docHtml() {
    const R = meta(), t = A.S.tank;
    const sel = selected(R.scope);
    const all = A.M.map(m => ({ m, r: A.run(m) }));
    const findings = [];
    sel.forEach(({ m, r }) => (r.checks || []).forEach(c => { if (c.ok === false || c.ok === 'warn') findings.push({ m, c }); }));
    const cnt = s => sel.filter(x => x.r.status === s).length;
    const info = [['No. laporan', R.no], ['Tanggal inspeksi', R.date], ['Perusahaan / klien', R.client], ['Tag tangki', t.tag], ['Nama / keterangan', t.name], ['Lokasi', t.loc], ['Produk / service', t.service], ['Tahun operasi', t.year]];
    const dims = [['Diameter D', f(+t.D), 'm'], ['Tinggi shell', f(+t.Hs), 'm'], ['Tinggi cairan maks.', f(+t.HL), 'm'], ['Specific gravity', f(+t.G, 2), ''], ['Jenis roof', t.roofType === 'open' ? 'Open top / floating' : 'Fixed roof', ''], ['Jumlah course', (t.courses || []).length, '']];
    return `
      <header class="rd-cover">
        <div class="rd-title"><p class="eyebrow">Laporan evaluasi &amp; inspeksi tangki timbun</p>
          <h1>${esc(t.tag || 'Tangki')} ${t.name ? '— ' + esc(t.name) : ''}</h1>
          <p class="muted">Dasar evaluasi: API Std 653 5th Ed. (2014) dan API Std 650 (2020)</p></div>
        <div class="rd-two">
          <table class="kv">${info.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v || '–')}</td></tr>`).join('')}</table>
          <table class="kv">${dims.map(([k, v, u]) => `<tr><th>${k}</th><td class="num">${esc(v)} ${u}</td></tr>`).join('')}
            <tr><th>Course (lebar × t nominal)</th><td class="num small">${(t.courses || []).map((c, i) => `C${i + 1}: ${c.w} × ${c.tNom} mm`).join('<br>')}</td></tr></table>
        </div>
        ${R.charts ? `<div class="rd-fig">${A.tankDrawing('Gambar 1 — Konfigurasi tangki (tampak samping)')}</div>` : ''}
      </header>
      <section class="rd-sec">
        <h2>1. Ringkasan hasil</h2>
        <p>${sel.length} modul dievaluasi: <b class="st-txt pass">${cnt('pass')} memenuhi</b>, <b class="st-txt warn">${cnt('warn')} perlu tindak lanjut</b>, <b class="st-txt fail">${cnt('fail')} tidak memenuhi</b>${cnt('na') ? `, ${cnt('na')} informasi` : ''}.</p>
        <table class="rd-tbl"><thead><tr><th>Kode</th><th>Modul</th><th>Kategori</th><th>Referensi</th><th class="r">NG</th><th class="r">Cek</th><th>Status</th></tr></thead><tbody>
        ${sel.map(({ m, r }) => { const c = A.catOf(m); const ck = r.checks || []; return `<tr><td class="code">${m.id}</td><td>${esc(m.title)}</td><td>${c.id} · ${esc(c.groups.find(g => g.id === m.grp).title)}</td><td class="small">${m.refs.map(esc).join('; ')}</td><td class="r num">${ck.filter(x => x.ok === false).length}</td><td class="r num">${ck.filter(x => x.ok === 'warn').length}</td><td><b class="pill st-${r.status}">${A.STATUS_TXT[r.status]}</b></td></tr>`; }).join('')}
        </tbody></table>
      </section>
      <section class="rd-sec">
        <h2>2. Daftar temuan</h2>
        ${findings.length ? `<table class="rd-tbl"><thead><tr><th>Kode</th><th>Pemeriksaan</th><th class="r">Terukur</th><th class="r">Kriteria</th><th>Ref.</th><th>Status</th></tr></thead><tbody>
          ${findings.map(({ m, c }) => `<tr><td class="code">${m.id}</td><td>${esc(c.l)}</td><td class="r num">${esc(c.meas ?? '')} ${esc(c.u || '')}</td><td class="r num">${esc(c.lim ?? '')}</td><td class="small">${esc(c.ref || '')}</td><td><b class="pill st-${A.okCls(c.ok)}">${A.okTxt(c.ok)}</b></td></tr>`).join('')}
        </tbody></table>` : '<p class="muted">Tidak ada pemeriksaan yang berstatus NG atau Cek pada modul yang dipilih.</p>'}
        ${R.notes ? `<h3>Kesimpulan / rekomendasi</h3><p class="rd-notes">${esc(R.notes).replace(/\n/g, '<br>')}</p>` : ''}
      </section>
      ${sel.map(({ m, r }, i) => modHtml(m, r, i + 3, R)).join('')}
      <section class="rd-sec rd-sign">
        <h2>Pengesahan</h2>
        <div class="sign">${[['Dibuat oleh', R.insp], ['Diperiksa oleh', R.chk], ['Disetujui oleh', R.appr]].map(([k, v]) => `<div><span class="muted small">${k}</span><div class="sline"></div><b>${esc(v || '')}</b><span class="muted small">Tanggal:</span></div>`).join('')}</div>
        <p class="muted small">Dihasilkan dengan Toolkit Tangki. Kurva edge settlement (API 653 Fig. B.11/B.12) didigitasi dari grafik standar. Keputusan akhir oleh inspector / storage tank engineer yang berwenang.</p>
      </section>`;
  }

  function modHtml(m, r, no, R) {
    const c = A.catOf(m);
    const fl = fieldsList(m), it = R.inputs ? inputTable(m) : null;
    const body = A.resultsHtml(Object.assign({}, r, R.charts ? {} : { chart: null, charts: null }));
    return `<section class="rd-sec rd-mod">
      <div class="rd-mh"><span class="code">${m.id}</span><h2>${no}. ${esc(m.title)}</h2><b class="pill st-${r.status}">${A.STATUS_TXT[r.status]}</b></div>
      <p class="small muted">${c.id} · ${esc(c.title)} — Referensi: ${m.refs.map(esc).join('; ')}</p>
      <p class="small"><b>Parameter yang ditinjau:</b> ${m.params.map(esc).join(' · ')}</p>
      ${R.inputs && (fl.length || it) ? `<div class="rd-in">
        ${fl.length ? `<table class="kv sm"><caption>Data input</caption>${fl.map(x => `<tr><th>${esc(x.l)}</th><td class="num">${esc(x.v)} ${esc(x.u === '–' ? '' : x.u)}</td></tr>`).join('')}</table>` : ''}
        ${it && it.rows.length ? `<div class="tbl-wrap"><table class="rd-tbl sm"><caption>${esc(it.title)}</caption><thead><tr><th>#</th>${it.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${it.rows.map((row, i) => `<tr><td class="num">${i + 1}</td>${row.map(x => `<td class="num">${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
      </div>` : ''}
      <div class="rd-res">${body}</div>
    </section>`;
  }

  /* ---------- Excel (js/xlsx-lite.js, tanpa koneksi internet) ---------- */
  const cell = v => {
    if (v == null) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? v : '';
    const s = String(v).trim();
    return /^[-+]?\d+(\.\d+)?$/.test(s) ? Number(s) : s;
  };
  function Sheet(name, cols) {
    const sh = { name, cols, rows: [], bold: new Set(), title: new Set() };
    sh.row = (r, kind) => { if (kind === 'b') sh.bold.add(sh.rows.length); if (kind === 't') sh.title.add(sh.rows.length); sh.rows.push((r || []).map(cell)); return sh; };
    return sh;
  }
  function buildWorkbook() {
    const R = meta(), t = A.S.tank, sel = selected(R.scope);
    const st = s => A.STATUS_TXT[s];
    const sum = Sheet('Ringkasan', [26, 42, 30, 44, 11, 11, 20]);
    sum.row(['LAPORAN EVALUASI & INSPEKSI TANGKI TIMBUN'], 't').row(['Dasar: API Std 653 5th Ed. (2014), API Std 650 (2020)']).row([]);
    [['No. laporan', R.no], ['Tanggal inspeksi', R.date], ['Perusahaan / klien', R.client], ['Tag tangki', t.tag], ['Nama', t.name], ['Lokasi', t.loc], ['Produk', t.service],
      ['Diameter D (m)', t.D], ['Tinggi shell (m)', t.Hs], ['Tinggi cairan maks. (m)', t.HL], ['Specific gravity', t.G], ['Jenis roof', t.roofType === 'open' ? 'Open top / floating' : 'Fixed roof'],
      ['Dibuat oleh', R.insp], ['Diperiksa oleh', R.chk], ['Disetujui oleh', R.appr]].forEach(r => sum.row(r));
    sum.row([]).row(['Kode', 'Modul', 'Kategori', 'Referensi', 'Jumlah NG', 'Jumlah Cek', 'Status'], 'b');
    sel.forEach(({ m, r }) => { const c = A.catOf(m), ck = r.checks || []; sum.row([m.id, m.title, c.id + ' · ' + c.groups.find(g => g.id === m.grp).title, m.refs.join('; '), ck.filter(x => x.ok === false).length, ck.filter(x => x.ok === 'warn').length, st(r.status)]); });
    if (R.notes) sum.row([]).row(['Kesimpulan / rekomendasi', R.notes]);

    const fnd = Sheet('Semua pemeriksaan', [8, 32, 56, 12, 8, 14, 16, 8]);
    fnd.row(['Kode', 'Modul', 'Pemeriksaan', 'Terukur', 'Satuan', 'Kriteria', 'Referensi', 'Status'], 'b');
    sel.forEach(({ m, r }) => (r.checks || []).forEach(c => fnd.row([m.id, m.title, c.l, c.meas, c.u || '', c.lim, c.ref || '', A.okTxt(c.ok)])));
    fnd.filter = 'A1:H' + fnd.rows.length;

    const tk = Sheet('Data tangki', [10, 14, 16]);
    tk.row(['Course', 'Lebar (mm)', 't nominal (mm)'], 'b');
    (t.courses || []).forEach((c, i) => tk.row([i + 1, c.w, c.tNom]));

    const mods = sel.map(({ m, r }) => {
      const a = Sheet(m.id, [46, 16, 12, 16, 16, 12, 12, 12, 12, 12]);
      a.row([m.id + ' — ' + m.title], 't').row(['Status', st(r.status)]).row(['Referensi', m.refs.join('; ')]).row(['Parameter yang ditinjau', m.params.join('; ')]).row(['Uraian', m.desc]).row([]);
      const fl = fieldsList(m);
      if (fl.length) { a.row(['INPUT', 'Nilai', 'Satuan'], 'b'); fl.forEach(x => a.row([x.l, x.v, x.u === '–' ? '' : x.u])); a.row([]); }
      const it = inputTable(m);
      if (it && it.rows.length) { a.row([it.title.toUpperCase()], 'b'); a.row(['#'].concat(it.head), 'b'); it.rows.forEach((row, i) => a.row([i + 1].concat(row))); a.row([]); }
      if ((r.summary || []).length) { a.row(['HASIL', 'Nilai', 'Satuan', 'Keterangan'], 'b'); r.summary.forEach(s => a.row([s.l, s.v, s.u, s.s || ''])); a.row([]); }
      if ((r.checks || []).length) { a.row(['PEMERIKSAAN', 'Terukur', 'Satuan', 'Kriteria', 'Referensi', 'Status'], 'b'); r.checks.forEach(c => a.row([c.l, c.meas, c.u || '', c.lim, c.ref || '', A.okTxt(c.ok)])); a.row([]); }
      if (r.table) { a.row(['TABEL PERHITUNGAN'], 'b'); a.row(r.table.head, 'b'); r.table.rows.forEach(row => a.row(row.map(x => x && typeof x === 'object' ? A.okTxt(x.ok) : x))); a.row([]); }
      if ((r.notes || []).length) { a.row(['CATATAN'], 'b'); r.notes.forEach(n => a.row([n])); }
      if (r.error) a.row(['ERROR', r.error]);
      return a;
    });
    return [sum, fnd, tk].concat(mods);
  }
  function exportXlsx() {
    if (A.inFrame) return A.toast('Unduhan tidak tersedia di pratinjau ini.');
    const R = meta(), t = A.S.tank;
    const bytes = window.XLite.build(buildWorkbook());
    const name = `Laporan_${(t.tag || 'tangki').replace(/[^\w-]+/g, '_')}_${R.date || today()}.xlsx`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    $('#rp-msg').textContent = 'File diunduh: ' + name;
  }

  window.TKViews = Object.assign(window.TKViews || {}, { laporan: render });
})();
