# Spec MVP — Threads Reader Mode (Chrome Extension)

**Status:** Draft v1 · **Owner:** MoonirDEV · **Target build:** Claude Code

---

## 1. Problem Statement

Tulisan panjang di Threads terpecah menjadi rangkaian post pendek (self-thread). Membacanya di web melelahkan: scroll berulang, terdistraksi UI feed, dan tidak ada cara menyalin seluruh thread sebagai satu tulisan utuh. Power user dan pembaca konten long-form (segmen yang besar di komunitas Threads Indonesia) tidak punya solusi — extension yang ada baru menyentuh quick-action dan feed switching, belum pengalaman membaca.

## 2. Goals

1. Pembaca dapat membuka self-thread panjang sebagai satu halaman bersih dalam **maksimal 2 klik** dari feed.
2. Hasil **copy as markdown adalah satu blok teks utuh** — tanpa batas antar-post, siap tempel ke editor mana pun.
3. **Local-first & minimal permissions**: seluruh proses terjadi di browser, tanpa server, tanpa network request keluar, host permission hanya domain Threads.
4. Ukuran keberhasilan teknis: pipeline ekstraksi merender benar **≥90% sampel self-thread uji** (target internal sebelum publish ke Chrome Web Store).

## 3. Non-Goals (v1)

- **Menyertakan reply orang lain** — butuh logika kurasi yang kompleks; masuk P2.
- **Export ke file (.md/.pdf)** — copy ke clipboard sudah memenuhi use case inti.
- **Render di tab baru** — overlay lebih sederhana dan cukup; tab baru dievaluasi setelah ada demand.
- **Riwayat/bookmark bacaan** — kandidat produk pendamping, bukan bagian reader mode.
- **Automation dalam bentuk apa pun** (auto-like, auto-follow, scraping massal) — risiko ToS, bertentangan dengan positioning pasif/read-only.

## 4. User Stories

1. Sebagai pembaca thread panjang, aku ingin membukanya sebagai satu halaman bersih agar bisa membaca tanpa scroll dan distraksi feed.
2. Sebagai penulis/kurator konten, aku ingin menyalin seluruh thread sebagai satu blok markdown beratribusi agar mudah dikutip atau diarsipkan.
3. Sebagai pembaca di malam hari, aku ingin mengatur ukuran font, lebar kolom, dan dark/light mode agar nyaman di mata.

## 5. Requirements

### P0 — Must-Have

**R1. Deteksi & tombol reader**
Tombol kecil bergaya native muncul pada post pertama sebuah self-thread (rangkaian ≥1 post berantai dari author yang sama).
- [ ] Tombol muncul pada halaman permalink post dan pada thread di feed
- [ ] Tombol tidak muncul ganda dan tidak merusak layout Threads
- [ ] Klik tombol memulai proses ekstraksi + membuka overlay

**R2. Ekstraksi self-thread**
Mengumpulkan seluruh rangkaian post dari author yang sama, termasuk yang belum dimuat.
- [ ] Memicu lazy-load secara programmatic (scroll / klik "View more") hingga rangkaian lengkap, dengan `MutationObserver` + timeout aman
- [ ] Hasil ekstraksi berupa `ThreadPost[]` terurut sesuai urutan asli
- [ ] Reply dari akun lain tidak ikut terekstraksi
- [ ] Jika struktur DOM tidak dikenali, tampilkan pesan error yang jelas — tidak gagal diam-diam

**R3. Overlay reader**
Overlay full-viewport di atas halaman Threads dengan tipografi nyaman baca.
- [ ] Menampilkan hasil merge (aturan §6), atribusi author, dan estimasi waktu baca
- [ ] Dapat ditutup via tombol close dan tombol `Esc`
- [ ] Scroll overlay tidak ikut men-scroll halaman di belakangnya

**R4. Copy as markdown & plain text**
- [ ] Output markdown = **satu blok teks utuh** hasil pipeline normalisasi (§6)
- [ ] Header atribusi sekali di awal (`**Nama (@username)**`), footer link ke post pertama
- [ ] Tersedia juga varian plain text (tanpa sintaks markdown)
- [ ] Ada konfirmasi visual singkat setelah tersalin

**R5. Minimal permissions & local-first**
- [ ] Host permission hanya domain Threads; tidak ada permission `tabs`, `history`, atau sejenisnya
- [ ] Tidak ada network request ke server mana pun
- [ ] Manifest V3, content script sebagai komponen utama

### P1 — Nice-to-Have (fast follow)

- **Preferensi baca**: ukuran font, lebar kolom, dark/light — persist via `chrome.storage.local`
- **Media inline**: gambar/video disisipkan sebagai `![media](url)` pada posisi aslinya di output markdown
- **Keyboard shortcut** untuk membuka reader pada thread yang sedang dilihat

### P2 — Future Considerations

- Menyertakan reply pilihan (kurasi berdasarkan likes) — data model `ThreadPost[]` harus tidak menghalangi ini
- Export ke file `.md`
- Bookmark manager dengan tagging sebagai produk pendamping (arah monetisasi freemium gabungan)

## 6. Aturan Normalisasi (pipeline merge)

Urutan pipeline: `ThreadPost[]` → normalisasi per-post → penggabungan → string tunggal.

1. **Strip penanda numbering.** Hapus pola di awal/akhir teks post: `1/5`, `(2/7)`, `2 of 7`, `🧵`, `cont.`, `lanjut...` — regex harus toleran terhadap variasi spasi dan tanda kurung.
2. **Join rule.** Default: gabungkan antar-post dengan satu baris kosong (paragraf baru). **Heuristik sambung-langsung**: jika post sebelumnya berakhir tanpa tanda baca akhir (`.`, `!`, `?`, `:`, emoji penutup) DAN post berikutnya diawali huruf kecil → sambung dengan satu spasi (kalimat terpotong).
3. **Media** (P1): sisipkan sebagai link markdown pada posisi asli, jangan dikumpulkan di akhir.
4. **Atribusi sekali saja.** Header dan footer di level dokumen, tidak diulang per-post.
5. **Whitespace cleanup.** Trim trailing spaces per baris; collapse baris kosong berturut-turut menjadi maksimal satu.

## 7. Arsitektur Teknis

- **Manifest V3**, content script sebagai inti; tanpa background logic kompleks.
- **Selector defensif**: pegangan ke `aria-label`, `role`, dan struktur elemen — hindari class name hasil obfuscation. Seluruh selector dikumpulkan dalam **satu modul adapter** agar mudah dipatch saat Meta mengubah DOM.
- **Data model**: `ThreadPost { text: string, mediaUrls: string[], postUrl: string, timestamp: string }`.
- **Single source of truth**: overlay reader dan fitur copy mengkonsumsi output pipeline yang sama.
- **Domain**: verifikasi perilaku di `threads.com` dan redirect lama `threads.net`.

## 8. Edge Cases

- Thread hanya 1 post → tombol tetap berfungsi (kasus degenerate, output tanpa merge)
- Post terhapus di tengah rangkaian → lanjutkan dengan penanda `[post tidak tersedia]`
- Quote/repost milik author sendiri di tengah rangkaian → v1: skip, catat sebagai limitation
- Thread sangat panjang (>50 post) → progress indicator saat ekstraksi + batas aman agar tab tidak freeze
- Konten emoji-heavy dan teks campuran — pastikan heuristik join tidak salah sambung
- DOM Threads berubah → error jelas + petunjuk lapor, bukan silent failure

## 9. Risiko & Mitigasi

| Risiko | Level | Mitigasi |
|---|---|---|
| Meta mengubah DOM/markup | Tinggi | Modul adapter terpisah, selector defensif, rilis patch cepat |
| Persepsi ToS | Rendah | Fitur murni pasif read-only, tanpa aksi atas nama user, tanpa scraping massal |
| Pasar terbatas (desktop power user) | Sedang | Ekspektasi install realistis; nilai utama: portfolio + pintu masuk ke suite |

## 10. Open Questions (non-blocking)

- **Nama & branding extension** — keputusan owner sebelum publish.
- **Entry point dari post tengah**: jika user membuka permalink post ke-3, apakah reader mundur otomatis ke post pertama? (engineering — putuskan saat implementasi; saran: ya, mundur ke akar rangkaian)
- **Perilaku di feed vs permalink**: apakah ekstraksi dari feed perlu redirect dulu ke permalink agar stabil? (engineering)

## 11. Definisi Selesai MVP

- [ ] Semua acceptance criteria P0 (R1–R5) terpenuhi
- [ ] Lolos uji manual pada ≥20 self-thread nyata beragam (pendek, panjang, ber-media, ber-numbering, tanpa numbering) dengan tingkat render benar ≥90%
- [ ] Tidak ada network request keluar (diverifikasi via DevTools)
- [ ] Siap submit ke Chrome Web Store: ikon, deskripsi, privacy policy singkat ("tidak mengumpulkan data apa pun")