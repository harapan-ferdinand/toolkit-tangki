/* Toolkit Tangki — visualisasi konfigurasi (SVG murni, mengikuti token warna tema).
 *  TKViz.tank(spec)  : tampak samping tangki (course, cairan, roof, bottom, dimensi)
 *  TKViz.polar(spec) : tampak atas, deviasi per stasiun keliling + pita toleransi
 */
(function (root) {
  const V = {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const n2 = (x, d = 2) => Number.isFinite(x) ? x.toFixed(d) : '–';

  /* spec: { D, Hs, HL, roof: 'fixed'|'open', courses:[{w (mm), t (mm), ok, label}], title } */
  V.tank = function (spec) {
    const cs = (spec.courses || []).filter(c => Number.isFinite(c.w) && c.w > 0);
    const D = spec.D > 0 ? spec.D : 10;
    const Hc = cs.reduce((a, c) => a + c.w, 0) / 1000;
    const H = Hc > 0 ? Hc : (spec.Hs > 0 ? spec.Hs : 10);
    const W = 740, padL = 92, padR = 230, padT = 44, padB = 70;
    const maxW = W - padL - padR, maxH = 300;
    const s = Math.min(maxW / D, maxH / H);
    const tw = D * s, th = H * s;
    const x0 = padL + (maxW - tw) / 2, x1 = x0 + tw;
    const roofRise = spec.roof === 'open' ? 0 : Math.max(tw * 0.07, 12);
    const yTop = padT + roofRise, yBot = yTop + th;
    const SVGH = yBot + padB;
    let g = '';
    // tanah / foundation
    g += `<rect class="tk-found" x="${x0 - 26}" y="${yBot + 3}" width="${tw + 52}" height="12" rx="1"/>`;
    g += `<line class="tk-ground" x1="${x0 - 60}" x2="${x1 + 60}" y1="${yBot + 15}" y2="${yBot + 15}"/>`;
    // cairan
    if (spec.HL > 0) {
      const yL = yBot - Math.min(spec.HL, H) * s;
      g += `<rect class="tk-liq" x="${x0}" y="${yL}" width="${tw}" height="${yBot - yL}"/>`;
      g += `<line class="tk-liq-l" x1="${x0}" x2="${x1}" y1="${yL}" y2="${yL}"/>`;
      g += `<path class="tk-liq-m" d="M${x0 + 14} ${yL - 9} l6 8 l6 -8 z"/>`;
      g += `<text class="tk-t tk-liq-t" x="${x0 + 30}" y="${yL - yTop < 16 ? yL + 14 : yL - 3}">HL ${n2(spec.HL)} m</text>`;
      if (spec.roof === 'open') {
        const yd = yL - 6;
        g += `<rect class="tk-deck" x="${x0 + 4}" y="${yd - 7}" width="${tw - 8}" height="7"/>`;
        g += `<rect class="tk-pont" x="${x0 + 4}" y="${yd - 12}" width="${Math.min(tw * 0.12, 40)}" height="12"/><rect class="tk-pont" x="${x1 - 4 - Math.min(tw * 0.12, 40)}" y="${yd - 12}" width="${Math.min(tw * 0.12, 40)}" height="12"/>`;
        g += `<text class="tk-t" x="${(x0 + x1) / 2}" y="${yd - 16}" text-anchor="middle">floating roof</text>`;
      }
    }
    // course shell
    let y = yBot;
    const lblX = x1 + 16;
    cs.forEach((c, i) => {
      const h = c.w / 1000 * s;
      const cls = c.ok === true ? 'pass' : c.ok === false ? 'fail' : c.ok === 'warn' ? 'warn' : 'na';
      const thick = Math.max(7, Math.min(13, (c.t || 6) * 0.6));
      g += `<rect class="tk-shell tk-${cls}" x="${x0 - thick}" y="${y - h}" width="${thick}" height="${h}"/>`;
      g += `<rect class="tk-shell tk-${cls}" x="${x1}" y="${y - h}" width="${thick}" height="${h}"/>`;
      g += `<line class="tk-seam" x1="${x0 - thick}" x2="${x0}" y1="${y - h}" y2="${y - h}"/><line class="tk-seam" x1="${x1}" x2="${x1 + thick}" y1="${y - h}" y2="${y - h}"/>`;
      if (h >= 13) {
        g += `<rect class="tk-${cls}" x="${lblX}" y="${y - h / 2 - 5}" width="10" height="10" rx="2"/>`;
        g += `<text class="tk-t tk-c" x="${lblX + 15}" y="${y - h / 2 + 4}">C${i + 1} · t ${n2(c.t, 1)} mm${c.label ? ' · ' + esc(c.label) : ''}</text>`;
        g += `<line class="tk-lead" x1="${x1 + thick + 2}" x2="${lblX - 4}" y1="${y - h / 2}" y2="${y - h / 2}"/>`;
      }
      y -= h;
    });
    // roof
    if (spec.roof !== 'open') {
      g += `<path class="tk-roof" d="M${x0 - 6} ${yTop} L${(x0 + x1) / 2} ${yTop - roofRise} L${x1 + 6} ${yTop} Z"/>`;
      g += `<text class="tk-t" x="${(x0 + x1) / 2}" y="${yTop - roofRise - 7}" text-anchor="middle">fixed roof</text>`;
    } else {
      g += `<line class="tk-girder" x1="${x0 - 14}" x2="${x0}" y1="${yTop + 6}" y2="${yTop + 6}"/><line class="tk-girder" x1="${x1}" x2="${x1 + 14}" y1="${yTop + 6}" y2="${yTop + 6}"/>`;
    }
    // bottom + annular
    g += `<line class="tk-bottom" x1="${x0 - 8}" x2="${x1 + 8}" y1="${yBot + 1.5}" y2="${yBot + 1.5}"/>`;
    g += `<line class="tk-ann" x1="${x0 - 8}" x2="${x0 + Math.min(tw * 0.08, 30)}" y1="${yBot + 1.5}" y2="${yBot + 1.5}"/><line class="tk-ann" x1="${x1 - Math.min(tw * 0.08, 30)}" x2="${x1 + 8}" y1="${yBot + 1.5}" y2="${yBot + 1.5}"/>`;
    // dimensi D
    const yd = yBot + 40;
    g += `<line class="tk-dim" x1="${x0}" x2="${x1}" y1="${yd}" y2="${yd}" marker-start="url(#tkA)" marker-end="url(#tkA)"/>`;
    g += `<line class="tk-ext" x1="${x0}" x2="${x0}" y1="${yBot + 18}" y2="${yd + 6}"/><line class="tk-ext" x1="${x1}" x2="${x1}" y1="${yBot + 18}" y2="${yd + 6}"/>`;
    g += `<text class="tk-t tk-dim-t" x="${(x0 + x1) / 2}" y="${yd - 6}" text-anchor="middle">D = ${n2(D)} m</text>`;
    // dimensi H
    const xd = x0 - 42;
    g += `<line class="tk-dim" x1="${xd}" x2="${xd}" y1="${yTop}" y2="${yBot}" marker-start="url(#tkA)" marker-end="url(#tkA)"/>`;
    g += `<line class="tk-ext" x1="${xd - 6}" x2="${x0 - 12}" y1="${yTop}" y2="${yTop}"/>`;
    g += `<text class="tk-t tk-dim-t" x="${xd - 8}" y="${(yTop + yBot) / 2}" text-anchor="middle" transform="rotate(-90 ${xd - 8} ${(yTop + yBot) / 2})">H = ${n2(H)} m</text>`;
    const legend = [['pass', 'memenuhi'], ['warn', 'cek'], ['fail', 'tidak memenuhi'], ['na', 'tanpa evaluasi']]
      .filter(([k]) => cs.some(c => (c.ok === true ? 'pass' : c.ok === false ? 'fail' : c.ok === 'warn' ? 'warn' : 'na') === k));
    const showLeg = cs.some(c => c.ok != null);
    return `${spec.title ? `<div class="viz-t">${esc(spec.title)}</div>` : ''}
      ${showLeg ? `<div class="legend">${legend.map(([k, l]) => `<span class="lg"><i class="sw tk-${k}"></i>${l}</span>`).join('')}</div>` : ''}
      <div class="svg-wrap"><svg class="tk-svg" viewBox="0 0 ${W} ${SVGH}" role="img" aria-label="Tampak samping tangki D ${n2(D)} m, H ${n2(H)} m, ${cs.length} course">
      <defs><marker id="tkA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="tk-arrow" d="M0 1 L9 5 L0 9 z"/></marker></defs>${g}</svg></div>`;
  };

  /* spec: { labels:[], angles:[deg]|null, values:[mm], tol:number, unit, title, valueName } */
  V.polar = function (spec) {
    const n = spec.values.length;
    if (!n) return '';
    const ang = spec.angles && spec.angles.every(Number.isFinite) ? spec.angles : spec.values.map((_, i) => 360 * i / n);
    const W = 520, Hh = 440, cx = W / 2, cy = Hh / 2, R0 = 112, span = 58;
    const maxAbs = Math.max(...spec.values.filter(Number.isFinite).map(Math.abs), spec.tol || 0, 1e-9);
    const k = span / maxAbs;
    const P = (deg, r) => { const t = deg * Math.PI / 180; return [cx + r * Math.sin(t), cy - r * Math.cos(t)]; };
    let g = '';
    g += `<circle class="pl-base" cx="${cx}" cy="${cy}" r="${R0}"/>`;
    if (spec.tol) {
      g += `<circle class="pl-band" cx="${cx}" cy="${cy}" r="${R0 + k * spec.tol}"/><circle class="pl-band" cx="${cx}" cy="${cy}" r="${Math.max(R0 - k * spec.tol, 4)}"/>`;
    }
    for (let a = 0; a < 360; a += 45) { const [x, y] = P(a, R0 + span + 22); const [x2, y2] = P(a, R0 - span - 6); g += `<line class="pl-ax" x1="${x2}" y1="${y2}" x2="${x}" y2="${y}"/>`; }
    const pts = spec.values.map((v, i) => Number.isFinite(v) ? P(ang[i], R0 + k * v) : null).filter(Boolean);
    if (pts.length > 2) g += `<polygon class="pl-poly" points="${pts.map(p => p.map(z => z.toFixed(1)).join(',')).join(' ')}"/>`;
    spec.values.forEach((v, i) => {
      if (!Number.isFinite(v)) return;
      const [x, y] = P(ang[i], R0 + k * v);
      const bad = spec.tol && Math.abs(v) > spec.tol + 1e-9;
      g += `<circle class="pl-pt ${bad ? 'bad' : ''}" cx="${x}" cy="${y}" r="${bad ? 5 : 4}"><title>${esc(spec.labels ? spec.labels[i] : i + 1)}: ${n2(v, 1)} ${esc(spec.unit || '')}</title></circle>`;
      const [lx, ly] = P(ang[i], R0 + span + 30);
      if (n <= 24 || i % Math.ceil(n / 24) === 0) g += `<text class="pl-lb ${bad ? 'bad' : ''}" x="${lx}" y="${ly + 4}" text-anchor="middle">${esc(spec.labels ? spec.labels[i] : i + 1)}</text>`;
    });
    g += `<text class="pl-c" x="${cx}" y="${cy - 4}" text-anchor="middle">${esc(spec.center || 'nominal')}</text>`;
    g += `<text class="pl-c sm" x="${cx}" y="${cy + 12}" text-anchor="middle">skala deviasi diperbesar</text>`;
    return `${spec.title ? `<div class="viz-t">${esc(spec.title)}</div>` : ''}
      <div class="legend"><span class="lg"><i class="sw s1"></i>${esc(spec.valueName || 'Deviasi')}</span>${spec.tol ? `<span class="lg"><i class="sw lim dash"></i>Batas ± ${n2(spec.tol, 1)} ${esc(spec.unit || '')}</span>` : ''}<span class="lg"><i class="sw ring"></i>Lingkaran nominal</span></div>
      <div class="svg-wrap"><svg class="pl-svg" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Tampak atas deviasi ${n} stasiun">${g}</svg></div>`;
  };

  /* Ambil sudut dari label "45°" bila ada */
  V.anglesFrom = labels => {
    const a = labels.map(l => { const m = String(l).match(/(-?\d+(?:\.\d+)?)\s*°/); return m ? +m[1] : NaN; });
    return a.every(Number.isFinite) ? a : null;
  };

  root.TKViz = V;
  if (typeof module !== 'undefined') module.exports = V;
})(typeof window !== 'undefined' ? window : globalThis);
