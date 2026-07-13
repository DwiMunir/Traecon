# Chrome Web Store — Submission Kit

Semua teks siap copy-paste ke [Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Listing

**Name:** Treacon — Reader Mode for Threads

**Summary (dari manifest, 132 char max):**
Read long Threads self-threads as one clean page. Copy as markdown. Read-only, local-first — no servers, no data collection.

**Category:** Productivity → Tools

**Detailed description:**

```
Long posts on Threads get split into chains of short posts. Reading them means
endless scrolling through a distracting feed — and there's no way to copy the
whole thread as one piece of text.

Treacon fixes that. One click on the book icon that appears on the first post
of a self-thread, and the entire chain opens as a single clean page:

• Full thread merged into one readable article — post-numbering markers
  (1/5, (2/7), 🧵, "cont.") stripped, broken sentences re-joined
• Author attribution and estimated reading time
• Copy as Markdown: one solid block with an attribution header and a link
  back to the original thread — ready to paste anywhere
• Copy as plain text
• Comfortable typography, automatic dark/light mode, closes with Esc

Private by design:
• Runs only on threads.com / threads.net
• 100% local — no servers, zero network requests, nothing is collected
• Read-only: never acts on your behalf, never likes/follows/posts

Note: Treacon reads what your browser has already loaded. It works on the
threads you can see while logged in, and it never automates anything.
```

## Privacy tab

- **Single purpose:** Reformat a Threads self-thread (a chain of posts by the same author) into a single readable page with copy-as-markdown. Nothing else.
- **Permission justification — host permission `threads.com` / `threads.net`:** Required to inject the reader button and overlay into Threads pages and to read the thread text already rendered in the user's browser. This is the extension's only permission; it requests no API permissions at all.
- **Remote code:** No. All code is packaged in the extension.
- **Data usage disclosure:** centang "does not collect or use data" di semua kategori. Tidak ada data yang dikumpulkan, disimpan, maupun dikirim.
- **Privacy policy URL:** host isi `PRIVACY.md` (GitHub repo/gist/pages) lalu tempel URL-nya.

## Aset visual

| Aset | Ukuran | Status |
|---|---|---|
| Icon | 128×128 | ✅ otomatis dari paket (`icons/icon128.png`) |
| Screenshot (min 1, max 5) | 1280×800 atau 640×400 | ⬜ ambil manual — saran di bawah |
| Small promo tile (opsional) | 440×280 | ⬜ opsional, bisa dari `icons/logo.svg` |

Saran screenshot (ambil pada thread nyata yang panjang):
1. Overlay reader terbuka di atas halaman Threads (nilai inti)
2. Tombol buku di post pertama sebuah thread (cara pakai)
3. Hasil paste markdown di editor (fitur copy)

## Langkah submit

1. `npm run zip` → upload `treacon-<version>.zip`
2. Isi listing + privacy tab dari dokumen ini
3. Upload screenshot
4. Submit for review (review pertama biasanya 1–3 hari kerja)

Rilis berikutnya: naikkan `version` di `manifest.config.ts`, `npm run build`, `npm run zip`, upload.
