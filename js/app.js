/* Toolkit Tangki — UI: navigasi klasifikasi, data tangki, renderer modul, ringkasan & laporan. */
(function () {
  const { CATS, M, f } = window.TKModules;
  const C = window.TKCalc;
  const byId = Object.fromEntries(M.map(m => [m.id, m]));
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  /* ---------- State ---------- */
  const SAMPLE_TANK = {
    tag: 'T-101', name: 'Tangki contoh (data sampel)', loc: '', service: 'Crude oil',
    D: 30, Hs: 14.4, HL: 13.8, G: 0.9, year: 2005, roofType: 'fixed',
    courses: [14, 12, 10, 8, 8, 8].map(t => ({ w: 2400, tNom: t }))
  };
  const KEY = 'toolkit-tangki-v1';
  let S = load() || { tank: JSON.parse(JSON.stringify(SAMPLE_TANK)), mods: {}, sample: true };
  function load() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  let saveT;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }, 250); }
  const ms = id => (S.mods[id] = S.mods[id] || {});

  /* ---------- Parsing ---------- */
  const parseNum = s => {
    if (typeof s === 'number') return s;
    if (s == null) return NaN;
    const t = String(s).trim().replace(/\s/g, '').replace(',', '.');
    return t === '' ? NaN : Number(t);
  };

  /* ---------- Nilai field ---------- */
  function fieldRaw(m, fd) {
    const st = ms(m.id);
    if (st.f && fd.k in st.f) return st.f[fd.k];
    if (fd.link && S.tank[fd.link] != null && S.tank[fd.link] !== '') {
      const tv = S.tank[fd.link];
      if (fd.type === 'sel') { const i = fd.opts.findIndex(o => o.v === tv); return i >= 0 ? i : fd.def; }
      return tv;
    }
    return fd.def;
  }
  const isLinked = (m, fd) => fd.link && !(ms(m.id).f && fd.k in ms(m.id).f);
  function fieldVal(m, fd) {
    const r = fieldRaw(m, fd);
    if (fd.type === 'sel') return (fd.opts[r] || fd.opts[fd.def] || fd.opts[0]).v;
    if (fd.type === 'text') return r;
    return parseNum(r);
  }
  function rowsRaw(m) {
    const st = ms(m.id);
    if (st.rows) return st.rows;
    const t = m.table;
    if (t.link === 'courses' && S.tank.courses && S.tank.courses.length) {
      return S.tank.courses.map((c, i) => {
        const base = Object.assign({}, ...t.cols.map(col => ({ [col.k]: col.def })), t.rows[i] || {});
        if ('w' in base) base.w = c.w;
        if ('tNom' in base) base.tNom = c.tNom;
        return base;
      });
    }
    return t.rows.map(r => Object.assign({}, r));
  }
  function rowsVal(m) {
    return rowsRaw(m).map(r => {
      const o = {};
      m.table.cols.forEach(col => {
        const x = r[col.k];
        if (col.type === 'sel') { const i = x === '' || x == null ? col.def : x; o[col.k] = (col.opts[i] || col.opts[0]).v; }
        else if (col.type === 'text') o[col.k] = x == null ? '' : x;
        else o[col.k] = parseNum(x);
      });
      return o;
    });
  }
  function run(m) {
    const v = {};
    (m.fields || []).forEach(fd => { v[fd.k] = fieldVal(m, fd); });
    try {
      const out = m.compute(v, m.table ? rowsVal(m) : []);
      out.status = statusOf(out.checks || []);
      return out;
    } catch (e) {
      return { error: 'Input belum lengkap atau tidak valid (' + e.message + ').', checks: [], status: 'na' };
    }
  }
  function statusOf(checks) {
    if (checks.some(c => c.ok === false)) return 'fail';
    if (checks.some(c => c.ok === 'warn')) return 'warn';
    if (checks.some(c => c.ok === true)) return 'pass';
    return 'na';
  }
  const STATUS_TXT = { pass: 'Memenuhi', warn: 'Perlu tindak lanjut', fail: 'Tidak memenuhi', na: 'Info' };

  /* ---------- Sidebar ---------- */
  function renderNav(filter = '') {
    const q = filter.trim().toLowerCase();
    const res = Object.fromEntries(M.map(m => [m.id, run(m).status]));
    let h = '';
    CATS.forEach(cat => {
      let gh = '';
      cat.groups.forEach(g => {
        const mods = M.filter(m => m.grp === g.id).filter(m => !q || (m.id + ' ' + m.title + ' ' + m.params.join(' ') + ' ' + m.refs.join(' ')).toLowerCase().includes(q));
        if (!mods.length) return;
        gh += `<div class="nav-grp"><div class="nav-grp-t">${esc(g.title)}</div>` +
          mods.map(m => `<a class="nav-item" href="#${m.id}" data-id="${m.id}"><span class="dot st-${res[m.id]}" title="${STATUS_TXT[res[m.id]]}"></span><span class="code">${m.id}</span><span class="nt">${esc(m.title)}</span></a>`).join('') + '</div>';
      });
      if (gh) h += `<section class="nav-cat"><div class="nav-cat-t"><span class="cat-badge">${cat.id}</span>${esc(cat.title)}</div>${gh}</section>`;
    });
    $('#nav').innerHTML = h || '<p class="muted pad">Tidak ada modul yang cocok.</p>';
    markActive();
  }
  function markActive() {
    const id = (location.hash || '').slice(1);
    document.querySelectorAll('.nav-item, .top-link').forEach(a => a.classList.toggle('active', a.dataset.id === id || a.getAttribute('href') === '#' + id));
  }

  /* ---------- Views ---------- */
  function route() {
    const id = decodeURIComponent((location.hash || '#beranda').slice(1));
    const main = $('#main');
    main.onclick = main.oninput = main.onchange = null;
    if (byId[id]) renderModule(byId[id]);
    else if (id === 'tangki') renderTank();
    else if (id === 'ringkasan') renderSummary();
    else if (window.TKViews && window.TKViews[id]) window.TKViews[id]($('#main'));
    else renderHome();
    markActive();
    document.body.classList.remove('nav-open');
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function sampleBanner() {
    return S.sample ? `<div class="banner"><p><strong>Data contoh.</strong> Angka yang tampil adalah sampel untuk memperlihatkan cara kerja perhitungan. Isi <a href="#tangki">Data Tangki</a> dan tabel inspeksi dengan data Anda.</p><button class="btn ghost sm" data-close-banner>Tutup</button></div>` : '';
  }

  function renderHome() {
    const res = Object.fromEntries(M.map(m => [m.id, run(m).status]));
    const count = s => M.filter(m => res[m.id] === s).length;
    $('#main').innerHTML = `
      ${sampleBanner()}
      <header class="page-h">
        <p class="eyebrow">Klasifikasi evaluasi · API 653 5th Ed. (2014) &amp; API 650 (2020)</p>
        <h1>Pilih apa yang mau dianalisa</h1>
        <p class="lead">Tiga kategori di bawah memisahkan <b>perhitungan komponen</b>, <b>inspeksi dimensional dengan toleransi</b>, dan <b>settlement</b>. Setiap modul punya kode (mis. <span class="code">SH-01</span>) supaya hasil mudah ditelusuri balik ke klausul standar dan ke parameter yang ditinjau.</p>
        <div class="kpis">
          <div class="kpi"><span class="n">${M.length}</span><span>modul</span></div>
          <div class="kpi st-pass"><span class="n">${count('pass')}</span><span>memenuhi</span></div>
          <div class="kpi st-warn"><span class="n">${count('warn')}</span><span>tindak lanjut</span></div>
          <div class="kpi st-fail"><span class="n">${count('fail')}</span><span>tidak memenuhi</span></div>
        </div>
      </header>
      ${CATS.map(cat => `
        <section class="cat-block">
          <div class="cat-h"><span class="cat-badge lg">${cat.id}</span><div><h2>${esc(cat.title)}</h2><p class="muted">${esc(cat.desc)}</p></div></div>
          ${cat.groups.map(g => `
            <div class="trace">
              <h3>${esc(g.title)} <span class="code muted">${g.id}</span></h3>
              <div class="trace-tbl" role="table">
                <div class="tr th" role="row"><span>Kode</span><span>Modul</span><span>Parameter yang ditinjau</span><span>Referensi</span><span>Status</span></div>
                ${M.filter(m => m.grp === g.id).map(m => `
                  <a class="tr" role="row" href="#${m.id}">
                    <span class="code">${m.id}</span>
                    <span class="tt">${esc(m.title)}</span>
                    <span class="chips">${m.params.map(p => `<i>${esc(p)}</i>`).join('')}</span>
                    <span class="refs">${m.refs.map(esc).join('<br>')}</span>
                    <span><b class="pill st-${res[m.id]}">${STATUS_TXT[res[m.id]]}</b></span>
                  </a>`).join('')}
              </div>
            </div>`).join('')}
        </section>`).join('')}`;
  }

  /* ----- Data tangki ----- */
  function renderTank() {
    const t = S.tank;
    const fld = (k, l, u, type = 'num') => `<label class="fld"><span class="fl">${l}${u ? ` <em>${u}</em>` : ''}</span><input id="tk-${k}" data-k="${k}" ${type === 'num' ? 'inputmode="decimal"' : ''} value="${esc(t[k])}"></label>`;
    $('#main').innerHTML = `
      ${sampleBanner()}
      <header class="page-h"><p class="eyebrow">Profil</p><h1>Data Tangki</h1>
      <p class="lead">Nilai di sini otomatis dipakai oleh modul yang ditandai <span class="lnk-ic">⛓</span>. Ubah di modul bila satu perhitungan butuh nilai lain.</p></header>
      <div class="card chart-card" id="tk-viz"></div>
      <div class="card form-grid">
        ${fld('tag', 'Tag / nomor tangki', '', 'text')}${fld('name', 'Nama / keterangan', '', 'text')}
        ${fld('loc', 'Lokasi', '', 'text')}${fld('service', 'Produk / service', '', 'text')}
        ${fld('D', 'Diameter nominal D', 'm')}${fld('Hs', 'Tinggi shell', 'm')}
        ${fld('HL', 'Tinggi cairan maks.', 'm')}${fld('G', 'Specific gravity G', '–')}
        ${fld('year', 'Tahun mulai operasi', '')}
        <label class="fld"><span class="fl">Jenis roof</span><select id="tk-roofType" data-k="roofType">
          <option value="fixed" ${t.roofType === 'fixed' ? 'selected' : ''}>Fixed roof</option>
          <option value="open" ${t.roofType === 'open' ? 'selected' : ''}>Open top / floating roof</option></select></label>
      </div>
      <div class="card">
        <div class="tbl-h"><h3>Shell course</h3><span class="muted">Course 1 = paling bawah</span></div>
        <div class="tbl-wrap"><table class="edit" id="tk-courses"><thead><tr><th>#</th><th>Lebar (mm)</th><th>t nominal (mm)</th><th></th></tr></thead><tbody>
        ${t.courses.map((c, i) => `<tr><td class="rn">${i + 1}</td><td><input id="tkc-${i}-w" data-i="${i}" data-c="w" inputmode="decimal" value="${esc(c.w)}"></td><td><input id="tkc-${i}-tNom" data-i="${i}" data-c="tNom" inputmode="decimal" value="${esc(c.tNom)}"></td><td><button class="ic" data-del="${i}" aria-label="Hapus course ${i + 1}">×</button></td></tr>`).join('')}
        </tbody></table></div>
        <div class="row-btns"><button class="btn" id="tk-add">+ Tambah course</button>
        <span class="muted">Tinggi shell dari course: <b class="num">${f(t.courses.reduce((a, c) => a + (parseNum(c.w) || 0), 0) / 1000)}</b> m</span></div>
      </div>
      <div class="card row-btns">
        <button class="btn" id="tk-sync">Terapkan course ke semua modul</button>
        <button class="btn ghost" id="tk-clear">Mulai proyek baru (kosongkan)</button>
        <button class="btn ghost" id="tk-sample">Muat ulang data contoh</button>
      </div>`;
    $('#main').querySelectorAll('[data-k]').forEach(el => el.addEventListener('input', () => {
      const k = el.dataset.k;
      S.tank[k] = el.tagName === 'SELECT' || ['tag', 'name', 'loc', 'service'].includes(k) ? el.value : (isNaN(parseNum(el.value)) ? el.value : parseNum(el.value));
      changed();
    }));
    const drawTank = () => { $('#tk-viz').innerHTML = tankDrawing('Konfigurasi tangki (tampak samping)'); };
    drawTank();
    $('#main').oninput = drawTank;
    $('#main').onchange = drawTank;
    $('#tk-courses').addEventListener('input', e => {
      const el = e.target; if (!el.dataset.c) return;
      S.tank.courses[+el.dataset.i][el.dataset.c] = parseNum(el.value);
      changed();
    });
    $('#tk-courses').addEventListener('click', e => {
      const d = e.target.dataset.del; if (d == null) return;
      S.tank.courses.splice(+d, 1); changed(); renderTank();
    });
    $('#tk-add').onclick = () => { const last = S.tank.courses[S.tank.courses.length - 1] || { w: 2400, tNom: 8 }; S.tank.courses.push({ ...last }); changed(); renderTank(); };
    $('#tk-sync').onclick = () => { M.forEach(m => { if (m.table && m.table.link === 'courses') delete ms(m.id).rows; }); changed(); toast('Course diterapkan ke SH-01, SH-04, SH-05.'); };
    $('#tk-clear').onclick = () => confirmInline($('#tk-clear'), 'Kosongkan semua data?', () => {
      S = { tank: { tag: '', name: '', loc: '', service: '', D: '', Hs: '', HL: '', G: 1, year: '', roofType: 'fixed', courses: [{ w: 2400, tNom: '' }] }, mods: {}, sample: false };
      M.forEach(m => { if (m.table) ms(m.id).rows = m.table.link === 'courses' ? undefined : [Object.fromEntries(m.table.cols.map(c => [c.k, c.type === 'sel' ? c.def : '']))]; });
      changed(); renderTank();
    });
    $('#tk-sample').onclick = () => confirmInline($('#tk-sample'), 'Timpa dengan data contoh?', () => {
      S = { tank: JSON.parse(JSON.stringify(SAMPLE_TANK)), mods: {}, sample: true }; changed(); renderTank();
    });
  }

  function tankDrawing(title) {
    const t = S.tank;
    return window.TKViz.tank({ title, D: parseNum(t.D), Hs: parseNum(t.Hs), HL: parseNum(t.HL), roof: t.roofType, courses: (t.courses || []).map(c => ({ w: parseNum(c.w), t: parseNum(c.tNom) })) });
  }

  /* ----- Modul ----- */
  function catOf(m) { return CATS.find(c => c.groups.some(g => g.id === m.grp)); }
  function renderModule(m) {
    const cat = catOf(m), grp = cat.groups.find(g => g.id === m.grp);
    $('#main').innerHTML = `
      ${sampleBanner()}
      <nav class="crumb"><a href="#beranda">Klasifikasi</a> › <span>${cat.id} · ${esc(cat.title)}</span> › <span>${esc(grp.title)}</span></nav>
      <header class="page-h mod-h">
        <p class="eyebrow"><span class="code">${m.id}</span></p>
        <h1>${esc(m.title)}</h1>
        <div class="refs-row">${m.refs.map(r => `<span class="ref">${esc(r)}</span>`).join('')}</div>
        <p class="lead">${esc(m.desc)}</p>
        <div class="params"><span class="pl">Parameter yang ditinjau</span>${m.params.map((p, i) => `<span class="param"><b>${i + 1}</b>${esc(p)}</span>`).join('')}</div>
      </header>
      <div class="mod-grid">
        <section class="inputs card" aria-label="Input">
          <div class="sec-h"><h2>Input</h2><button class="btn ghost sm" id="m-reset">Reset modul</button></div>
          ${(m.fields || []).length ? `<div class="form-grid one">${m.fields.map(fd => fieldHtml(m, fd)).join('')}</div>` : ''}
          ${m.table ? tableHtml(m) : ''}
        </section>
        <section class="results" id="m-res" aria-live="polite"></section>
      </div>`;
    bindModule(m);
    renderResults(m);
  }
  function fieldHtml(m, fd) {
    const raw = fieldRaw(m, fd), lk = isLinked(m, fd);
    const lab = `<span class="fl">${esc(fd.l)}${fd.u ? ` <em>${esc(fd.u)}</em>` : ''}${fd.link ? (lk ? ' <span class="lnk-ic" title="Mengikuti Data Tangki">⛓</span>' : ` <button class="relink" data-relink="${fd.k}" title="Ikuti Data Tangki lagi">↺ data tangki</button>`) : ''}</span>`;
    if (fd.type === 'sel') return `<label class="fld">${lab}<select id="f-${m.id}-${fd.k}" data-f="${fd.k}">${fd.opts.map((o, i) => `<option value="${i}" ${+raw === i ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select></label>`;
    return `<label class="fld">${lab}<input id="f-${m.id}-${fd.k}" data-f="${fd.k}" inputmode="decimal" value="${esc(raw)}"></label>`;
  }
  function tableHtml(m) {
    const t = m.table, rows = rowsRaw(m);
    return `<div class="tbl-h"><h3>${esc(t.l)}</h3>${t.link === 'courses' ? '<button class="btn ghost sm" id="m-sync">Ambil dari Data Tangki</button>' : ''}</div>
      <p class="hint">Tempel langsung dari Excel: klik sel pertama lalu Ctrl+V. Baris bertambah otomatis.</p>
      <div class="tbl-wrap"><table class="edit" id="m-tbl"><thead><tr><th>#</th>${t.cols.map(c => `<th>${esc(c.l)}</th>`).join('')}<th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td class="rn">${i + 1}</td>${t.cols.map(c => cellHtml(m, c, r, i)).join('')}<td><button class="ic" data-del="${i}" aria-label="Hapus baris ${i + 1}">×</button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="row-btns"><button class="btn" id="m-add">+ Tambah baris</button><button class="btn ghost sm" id="m-clr">Kosongkan tabel</button></div>`;
  }
  function cellHtml(m, c, r, i) {
    const x = r[c.k], id = `c-${m.id}-${i}-${c.k}`;
    if (c.type === 'sel') return `<td><select id="${id}" data-r="${i}" data-c="${c.k}">${c.opts.map((o, j) => `<option value="${j}" ${(+(x === '' || x == null ? c.def : x)) === j ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select></td>`;
    return `<td><input id="${id}" data-r="${i}" data-c="${c.k}" ${c.type === 'text' ? '' : 'inputmode="decimal"'} value="${esc(x)}"></td>`;
  }
  function bindModule(m) {
    const st = ms(m.id);
    const main = $('#main');
    main.querySelectorAll('[data-f]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      st.f = st.f || {};
      st.f[el.dataset.f] = el.tagName === 'SELECT' ? +el.value : el.value;
      const fd = m.fields.find(x => x.k === el.dataset.f);
      if (fd.link && !el.closest('.fld').querySelector('.relink')) { const ic = el.closest('.fld').querySelector('.lnk-ic'); if (ic) ic.outerHTML = `<button class="relink" data-relink="${fd.k}" title="Ikuti Data Tangki lagi">↺ data tangki</button>`; }
      changed(m);
    }));
    main.onclick = (e => {
      const rl = e.target.closest('[data-relink]');
      if (rl) { delete st.f[rl.dataset.relink]; changed(m); renderModule(m); }
    });
    $('#m-reset').onclick = () => confirmInline($('#m-reset'), 'Reset input modul ini?', () => { delete S.mods[m.id]; changed(m); renderModule(m); });
    if (!m.table) return;
    const tbl = $('#m-tbl');
    const ensureRows = () => (st.rows = st.rows || rowsRaw(m).map(r => ({ ...r })));
    tbl.addEventListener('input', e => {
      const el = e.target; if (!el.dataset.c) return;
      ensureRows()[+el.dataset.r][el.dataset.c] = el.tagName === 'SELECT' ? +el.value : el.value;
      changed(m);
    });
    tbl.addEventListener('change', e => { if (e.target.tagName === 'SELECT') { ensureRows()[+e.target.dataset.r][e.target.dataset.c] = +e.target.value; changed(m); } });
    tbl.addEventListener('click', e => {
      const d = e.target.dataset.del; if (d == null) return;
      ensureRows().splice(+d, 1); changed(m); renderModule(m);
    });
    tbl.addEventListener('paste', e => {
      const el = e.target; if (!el.dataset || el.dataset.c == null) return;
      const txt = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[\t\n]/.test(txt.trim())) return;
      e.preventDefault();
      const grid = txt.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split(/\t|;/));
      const rows = ensureRows();
      const c0 = m.table.cols.findIndex(c => c.k === el.dataset.c), r0 = +el.dataset.r;
      grid.forEach((line, i) => {
        const ri = r0 + i;
        if (!rows[ri]) rows[ri] = Object.fromEntries(m.table.cols.map(c => [c.k, c.type === 'sel' ? c.def : '']));
        line.forEach((cell, j) => {
          const col = m.table.cols[c0 + j]; if (!col) return;
          if (col.type === 'sel') {
            const s = cell.trim().toLowerCase();
            let k = col.opts.findIndex(o => o.l.toLowerCase().startsWith(s) || String(o.v).toLowerCase() === s);
            rows[ri][col.k] = k >= 0 ? k : col.def;
          } else rows[ri][col.k] = cell.trim();
        });
      });
      changed(m); renderModule(m);
      toast(`${grid.length} baris ditempel.`);
    });
    $('#m-add').onclick = () => {
      const rows = ensureRows();
      const last = rows[rows.length - 1];
      const keep = ['w', 'mat', 'o', 't', 'tNom'];
      rows.push(Object.fromEntries(m.table.cols.map(c => [c.k, last && (c.type === 'sel' || keep.includes(c.k)) ? last[c.k] : (c.type === 'sel' ? c.def : '')])));
      changed(m); renderModule(m);
      const inp = $('#m-tbl tbody tr:last-child input'); if (inp) inp.focus();
    };
    $('#m-clr').onclick = () => confirmInline($('#m-clr'), 'Kosongkan tabel?', () => { st.rows = [Object.fromEntries(m.table.cols.map(c => [c.k, c.type === 'sel' ? c.def : '']))]; changed(m); renderModule(m); });
    const sy = $('#m-sync'); if (sy) sy.onclick = () => { delete st.rows; changed(m); renderModule(m); };
  }

  function renderResults(m) {
    const r = run(m);
    $('#m-res').innerHTML = resultsHtml(r);
  }
  function resultsHtml(r, compact) {
    if (r.error) return `<div class="card err">${esc(r.error)}</div>`;
    const ck = r.checks || [];
    const nFail = ck.filter(c => c.ok === false).length, nWarn = ck.filter(c => c.ok === 'warn').length, nPass = ck.filter(c => c.ok === true).length;
    return `
      <div class="verdict st-${r.status}"><span class="vt">${STATUS_TXT[r.status]}</span><span class="vs">${nPass} memenuhi · ${nWarn} tindak lanjut · ${nFail} tidak memenuhi</span></div>
      ${(r.summary || []).length ? `<div class="tiles">${r.summary.map(s => `<div class="tile"><span class="tl">${esc(s.l)}</span><span class="tv num">${esc(s.v)}<small>${esc(s.u)}</small></span>${s.s ? `<span class="ts">${esc(s.s)}</span>` : ''}</div>`).join('')}</div>` : ''}
      ${ck.length ? `<div class="card flush"><div class="tbl-wrap"><table class="checks"><thead><tr><th>Pemeriksaan</th><th class="r">Terukur</th><th class="r">Kriteria</th><th>Ref.</th><th>Status</th></tr></thead><tbody>
        ${ck.map(c => `<tr class="row-${okCls(c.ok)}"><td>${esc(c.l)}</td><td class="r num">${c.meas != null ? esc(c.meas) + (c.u ? ` <small>${esc(c.u)}</small>` : '') : ''}</td><td class="r num">${c.lim != null ? esc(c.lim) : ''}</td><td class="ref-c">${esc(c.ref || '')}</td><td><b class="pill st-${okCls(c.ok)}">${okTxt(c.ok)}</b></td></tr>`).join('')}
      </tbody></table></div></div>` : ''}
      ${!compact ? [].concat(r.charts || [], r.chart ? [r.chart] : []).map(ch => `<div class="card chart-card">${chartSvg(ch)}</div>`).join('') : ''}
      ${r.table ? `<div class="card flush"><div class="tbl-wrap"><table class="out"><thead><tr>${r.table.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
        ${r.table.rows.map(row => `<tr>${row.map(c => c && typeof c === 'object' ? `<td><b class="pill st-${okCls(c.ok)}">${okTxt(c.ok)}</b></td>` : `<td class="num">${esc(c)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div></div>` : ''}
      ${(r.notes || []).length ? `<ul class="notes">${r.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`;
  }
  const okCls = ok => ok === true ? 'pass' : ok === false ? 'fail' : ok === 'warn' ? 'warn' : 'na';
  const okTxt = ok => ok === true ? 'OK' : ok === false ? 'NG' : ok === 'warn' ? 'Cek' : 'Info';

  /* ---------- Chart SVG ---------- */
  function chartSvg(ch) {
    if (ch.type === 'tank') return window.TKViz.tank(Object.assign({ roof: S.tank.roofType, Hs: parseNum(S.tank.Hs) }, ch));
    if (ch.type === 'polar') return window.TKViz.polar(ch);
    const W = 640, H = 260, L = 52, R = 14, T = 26, B = 42;
    const pw = W - L - R, ph = H - T - B;
    const bars = ch.type === 'bars';
    const n = bars ? ch.cats.length : ch.x.length;
    if (!n) return '';
    let ys = [];
    ch.series.forEach(s => s.y.forEach(y => { if (Number.isFinite(y)) ys.push(y); }));
    (ch.hlines || []).forEach(h => ys.push(h.y));
    if (bars) ys.push(0);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.08; lo -= bars && lo >= 0 ? 0 : pad; hi += pad;
    const ticks = niceTicks(lo, hi, 5); lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
    const Y = v => T + ph - (v - lo) / (hi - lo) * ph;
    let X, bw = 0;
    if (bars) { const step = pw / n; bw = Math.min(step * 0.6, 46); X = i => L + step * (i + 0.5); }
    else { const x0 = Math.min(...ch.x), x1 = Math.max(...ch.x); X = i => L + (x1 === x0 ? pw / 2 : (ch.x[i] - x0) / (x1 - x0) * pw); }
    let g = '';
    ticks.forEach(t => { g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/><text class="ax" x="${L - 6}" y="${Y(t) + 4}" text-anchor="end">${fmtTick(t)}</text>`; });
    if (lo < 0 && hi > 0) g += `<line class="zero" x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    const every = Math.ceil(n / 12);
    for (let i = 0; i < n; i += every) g += `<text class="ax" x="${X(i)}" y="${H - B + 16}" text-anchor="middle">${esc(bars ? ch.cats[i] : fmtTick(ch.x[i]))}</text>`;
    g += `<text class="ax-l" x="${L + pw / 2}" y="${H - 6}" text-anchor="middle">${esc(ch.xLabel)}</text><text class="ax-l" x="12" y="${T + ph / 2}" transform="rotate(-90 12 ${T + ph / 2})" text-anchor="middle">${esc(ch.yLabel)}</text>`;
    let marks = '';
    ch.series.forEach((s, si) => {
      if (bars && !s.line) {
        s.y.forEach((y, i) => { if (!Number.isFinite(y)) return; const y0 = Y(Math.max(0, Math.min(y, 0)) === 0 ? 0 : 0); const top = Math.min(Y(y), Y(0)), h = Math.abs(Y(y) - Y(0)); marks += `<rect class="bar ${s.cls}" x="${X(i) - bw / 2}" y="${top}" width="${bw}" height="${Math.max(h, 1)}" rx="2"><title>${esc((bars ? ch.cats[i] : '') + ': ' + f(y, 2))}</title></rect>`; });
      } else {
        let d = '', pen = false;
        s.y.forEach((y, i) => { if (!Number.isFinite(y)) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1); pen = true; });
        marks += `<path class="ln ${s.cls}" d="${d}" fill="none"/>`;
        s.y.forEach((y, i) => { if (Number.isFinite(y)) marks += `<circle class="pt ${s.cls} ${s.mark && s.mark.has(i) ? 'hl' : ''}" cx="${X(i)}" cy="${Y(y)}" r="${s.mark && s.mark.has(i) ? 4.5 : 3}"><title>${f(y, 2)}</title></circle>`; });
      }
    });
    (ch.hlines || []).forEach(h => { marks += `<line class="hl ${h.cls}" x1="${L}" x2="${W - R}" y1="${Y(h.y)}" y2="${Y(h.y)}"/><text class="hl-t ${h.cls}" x="${W - R - 4}" y="${Y(h.y) - 5}" text-anchor="end">${esc(h.name)} ${fmtTick(h.y)}</text>`; });
    const legend = ch.series.map(s => `<span class="lg"><i class="sw ${s.cls}"></i>${esc(s.name)}</span>`).join('') + (ch.hlines || []).filter((h, i, a) => a.findIndex(x => x.cls === h.cls) === i).map(h => `<span class="lg"><i class="sw ${h.cls} dash"></i>${esc(h.name.replace(/^[+−-]/, ''))}</span>`).join('');
    return `<div class="legend">${legend}</div><div class="svg-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik ${esc(ch.yLabel)} terhadap ${esc(ch.xLabel)}">${g}${marks}</svg></div>`;
  }
  function niceTicks(lo, hi, n) {
    const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= step0);
    const out = []; for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.5; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const fmtTick = v => Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en') : (+v.toFixed(2)).toString();

  /* ----- Ringkasan & laporan ----- */
  function renderSummary() {
    const t = S.tank;
    const all = M.map(m => ({ m, r: run(m) }));
    $('#main').innerHTML = `
      ${sampleBanner()}
      <header class="page-h"><p class="eyebrow">Laporan</p><h1>Ringkasan evaluasi ${esc(t.tag || '')}</h1>
      <p class="lead">${esc(t.name || '')}${t.service ? ' · ' + esc(t.service) : ''} · D ${f(+t.D)} m · H shell ${f(+t.Hs)} m · cairan maks. ${f(+t.HL)} m · G ${f(+t.G, 2)}</p>
      <div class="row-btns no-print">
        <label class="chk"><input type="checkbox" id="sm-only"> Tampilkan hanya yang perlu perhatian</label>
        ${inFrame ? '' : '<button class="btn" id="sm-print">Cetak / simpan PDF</button>'}
        <button class="btn ghost" id="sm-copy">Salin ringkasan (teks)</button>
      </div></header>
      <div id="sm-body">${all.map(({ m, r }) => `
        <section class="rep st-${r.status}" data-st="${r.status}">
          <div class="rep-h"><a href="#${m.id}" class="code">${m.id}</a><h2>${esc(m.title)}</h2><b class="pill st-${r.status}">${STATUS_TXT[r.status]}</b></div>
          <p class="muted small">${m.refs.map(esc).join(' · ')}</p>
          ${resultsHtml(r, true)}
        </section>`).join('')}</div>`;
    $('#sm-only').onchange = e => document.querySelectorAll('.rep').forEach(s => { s.hidden = e.target.checked && !['fail', 'warn'].includes(s.dataset.st); });
    const p = $('#sm-print'); if (p) p.onclick = () => window.print();
    $('#sm-copy').onclick = () => {
      const lines = [`RINGKASAN EVALUASI TANGKI ${t.tag || ''} — ${t.name || ''}`, `D ${t.D} m, H ${t.Hs} m, HL ${t.HL} m, G ${t.G}`, ''];
      all.forEach(({ m, r }) => {
        lines.push(`[${m.id}] ${m.title} — ${STATUS_TXT[r.status]}`);
        (r.checks || []).filter(c => c.ok === false || c.ok === 'warn').forEach(c => lines.push(`   ${okTxt(c.ok)}: ${c.l} | terukur ${c.meas ?? '-'} ${c.u || ''} | kriteria ${c.lim ?? '-'} (${c.ref || ''})`));
      });
      copyText(lines.join('\n'));
    };
  }

  /* ---------- util ---------- */
  function changed(m) {
    save();
    if (m && $('#m-res')) renderResults(m);
    renderNav($('#q').value);
    const tg = $('#tank-tag'); if (tg) tg.textContent = S.tank.tag ? S.tank.tag : 'Tanpa tag';
  }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function confirmInline(btn, q, fn) {
    if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = btn.dataset.orig; fn(); return; }
    btn.dataset.orig = btn.textContent; btn.dataset.armed = '1'; btn.textContent = q + ' Klik lagi';
    btn.classList.add('armed');
    setTimeout(() => { if (btn.isConnected && btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = btn.dataset.orig; btn.classList.remove('armed'); } }, 4000);
  }
  function copyText(txt) {
    const done = () => toast('Disalin ke clipboard.');
    try {
      navigator.clipboard.writeText(txt).then(done, () => fallback());
    } catch (e) { fallback(); }
    function fallback() {
      const ta = document.createElement('textarea'); ta.value = txt; ta.className = 'copy-fb'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Pilih teks lalu salin manual.'); }
    }
  }

  /* ---------- Proyek: simpan / buka file ---------- */
  function bindTop() {
    $('#q').addEventListener('input', e => renderNav(e.target.value));
    $('#menu').onclick = () => document.body.classList.toggle('nav-open');
    $('#btn-export').onclick = () => {
      const txt = JSON.stringify({ app: 'toolkit-tangki', v: 1, ...S }, null, 1);
      if (inFrame) { copyText(txt); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
      a.download = (S.tank.tag || 'tangki').replace(/[^\w-]+/g, '_') + '.tangki.json';
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    if (inFrame) $('#btn-export').textContent = 'Salin proyek (JSON)';
    $('#btn-import').onclick = () => $('#file').click();
    $('#file').onchange = e => {
      const fl = e.target.files[0]; if (!fl) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { const d = JSON.parse(rd.result); S = { tank: d.tank, mods: d.mods || {}, sample: false }; changed(); route(); toast('Proyek dibuka: ' + (S.tank.tag || fl.name)); }
        catch (err) { toast('File tidak bisa dibaca: bukan file proyek Toolkit Tangki.'); }
      };
      rd.readAsText(fl); e.target.value = '';
    };
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('click', e => {
    if (e.target.closest('[data-close-banner]')) { S.sample = false; save(); document.querySelectorAll('.banner').forEach(b => b.remove()); }
  });
  function boot() {
    bindTop();
    $('#tank-tag').textContent = S.tank.tag || 'Tanpa tag';
    renderNav();
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  // ekspos untuk pengujian
  window.TKApp = { run, byId, get S() { return S; }, CATS, M, esc, f, parseNum, fieldRaw, fieldVal, rowsRaw, isLinked, resultsHtml, chartSvg, tankDrawing, STATUS_TXT, okTxt, okCls, catOf, toast, copyText, inFrame, save };
})();
