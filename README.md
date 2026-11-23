# Toolkit Tangki

Aplikasi web untuk **analisa, engineering, dan inspeksi tangki timbun** berdasarkan
**API Std 653 5th Edition (2014)** dan **API Std 650 (2020)**. Berjalan sepenuhnya di browser,
tanpa server dan tanpa instalasi.

## Cara pakai

- **Online/lokal:** buka `index.html` di browser (Chrome, Edge, Firefox).
- **Satu file untuk dikirim:** `dist/toolkit-tangki.html` berisi seluruh aplikasi dalam satu file.
  Buat ulang dengan `node tools/build.js`.
- Data tersimpan otomatis di browser. Gunakan **Simpan proyek** / **Buka proyek** untuk file `.tangki.json`
  per tangki (bisa diarsipkan atau dibagikan ke rekan).
- Tabel bisa diisi dengan **copy-paste dari Excel**: klik sel pertama lalu Ctrl+V.
- **Ringkasan** menampilkan hasil semua modul, filter "perlu perhatian", cetak/PDF, dan salin teks temuan.

## Klasifikasi

Setiap modul punya kode agar hasil bisa ditelusuri ke parameter dan klausul standar.
Di dalam setiap modul ditampilkan **parameter yang ditinjau**, input, pemeriksaan (terukur vs kriteria
vs referensi klausul), grafik, dan catatan.

### A — Evaluasi & Perhitungan Komponen
| Kode | Modul | Referensi |
|---|---|---|
| SH-01 | Tebal minimum shell per course, sisa umur, batas hydrotest | 653 4.3.3.1, 4.3.3.2, Tabel 4.1–4.3 |
| SH-02 | Area korosi lokal (LTA): L, t1, t2 | 653 4.3.2.1 |
| SH-03 | Pitting tersebar | 653 4.3.2.2 |
| SH-04 | Desain tebal shell 1-foot method | 650 5.6.3, 5.6.1.1, Tabel 5.2a |
| SH-05 | Wind girder / transformed shell | 650 5.9.6 |
| BT-01 | MRT bottom & interval internal maksimum | 653 4.4.5.1, Tabel 4.4 |
| BT-02 | Bottom critical zone | 653 4.4.5.4 |
| BT-03 | Annular plate in-service (SG < 1) | 653 4.4.6.2, Tabel 4.5 |
| BT-04 | Annular plate desain & lebar radial | 650 5.5.2, 5.5.3, Tabel 5.1a |
| BT-05 | Proyeksi bottom di luar shell | 653 4.4.5.7, 650 5.4.2 |
| RF-01 | Roof plate in-service (0.09 in / 100 in²) | 653 4.2.1.2 |
| RF-02 | Self-supporting cone roof | 650 5.10.5.1 |
| RF-03 | Self-supporting dome/umbrella roof | 650 5.10.6.1 |
| IN-01 | Interval external & UT | 653 6.3.2.1, 6.3.3.2 |
| IN-02 | Interval internal awal (Tabel 6.1) | 653 6.4.2.1 |

### B — Inspeksi Dimensional & Toleransi
| Kode | Modul | API 650 (baru) | API 653 (rekonstruksi) |
|---|---|---|---|
| DT-01 | Plumbness | H/200 (7.5.2) | H/100, maks. 5 in (10.5.2) |
| DT-02 | Roundness | ±13/19/25/32 mm (7.5.3) | Tabel 10.2, 3× di atas 1 ft |
| DT-03 | Peaking | 13 mm (7.5.4 a) | 1/2 in (10.5.4) |
| DT-04 | Banding | 13 mm (7.5.4 b) | 1 in (10.5.5) |
| WD-01 | Misalignment sambungan vertikal | 7.2.3.1 | 10.4.4.1 |
| WD-02 | Projection sambungan horizontal | 7.2.3.2 | 10.4.4.2 |
| WD-03 | Weld reinforcement & undercut | 8.5.2 | – |
| FD-01 | Kerataan foundation / ringwall | 7.5.5.2 | 10.5.6.2 |

### C — Settlement (API 653 Annex B)
| Kode | Modul | Referensi |
|---|---|---|
| ST-01 | Shell settlement, cosine fit (R² ≥ 0.9), Si vs Smax | B.2.2.4, B.3.2.1 |
| ST-02 | Out-of-plane settlement arc (faktor K) | B.2.2.5, B.3.2.2 |
| ST-03 | Edge settlement Bew / Be / Bα | B.3.4, Fig. B.11–B.12 |
| ST-04 | Bulge / depresi bottom (0.37R) | B.3.3 |
| ST-05 | Settlement saat hydrotest | 650 7.3.7.7 |

## Satuan

Input dalam SI (m, mm, MPa). Rumus API 653 yang ditulis dalam satuan USC dihitung dalam USC dan dikonversi
otomatis (1 in = 25.4 mm, 1 ft = 0.3048 m). Untuk settlement (ST-01/02), Y dan E dalam psi sesuai standar.

## Batasan

- Kurva edge settlement (Figure B.11/B.12) **didigitasi** dari grafik standar dan diinterpolasi linier
  terhadap diameter. Verifikasi pada grafik asli bila hasil mendekati batas.
- Perhitungan tebal shell hanya beban cairan. Beban angin, gempa, vakum, temperatur tinggi, nozzle dan
  settlement dievaluasi terpisah (653 4.3.3.5).
- Metode 1-foot dibatasi D ≤ 61 m (200 ft); di atas itu perlu variable design point.
- Interpretasi toleransi lokal foundation "±3 mm dalam setiap 9 m" dijelaskan di modul FD-01.
- Aplikasi ini alat bantu; keputusan akhir tetap pada inspector / storage tank engineer yang berwenang.

## Pengembangan

```
js/data.js     tabel referensi (material, toleransi, kurva)
js/calc.js     fungsi perhitungan murni (bisa diuji di Node)
js/modules.js  definisi modul: klasifikasi, parameter, input, kriteria
js/app.js      antarmuka
tests/run.js   uji perhitungan: node tests/run.js
tools/build.js bundel satu file: node tools/build.js
```

Menambah modul baru cukup dengan satu blok `add({...})` di `js/modules.js`.

## Versi online (GitHub Pages)

Setelah GitHub Pages aktif (Settings → Pages → Deploy from a branch → `main` / `(root)`), aplikasi bisa dibuka di
https://harapan-ferdinand.github.io/toolkit-tangki/
