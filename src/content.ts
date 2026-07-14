// Entry point: injeksi tombol reader (R1) + orkestrasi klik → ekstraksi → overlay.

import * as adapter from './adapter'
import { consumeAutoOpen, extractThread, ExtractError, requestAutoOpen } from './extractor'
import * as overlay from './overlay'
import { buildThread } from './pipeline'

const BOOK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></svg>'

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
}

function waitFor(check: () => boolean, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      if (check()) return resolve(true)
      if (Date.now() - started > timeoutMs) return resolve(false)
      setTimeout(tick, 300)
    }
    tick()
  })
}

// --- Tombol reader (R1) ---

function makeButton(node: HTMLElement): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.setAttribute('data-treacon-btn', '')
  btn.setAttribute('aria-label', 'Buka reader mode')
  btn.title = 'Buka reader mode'
  btn.style.cssText =
    'background:none;border:none;cursor:pointer;color:currentColor;opacity:.55;padding:2px 4px;line-height:1;vertical-align:middle'
  btn.innerHTML = BOOK_SVG // markup statis milik kita, bukan konten post
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    onReaderClick(node)
  })
  return btn
}

/** Chain-head = post pada batas pergantian author dalam urutan kolom (rangkaian ≥1 post, R1). */
function ensureButtons(): void {
  const posts = adapter.getColumnPosts()
  let prevUsername: string | null = null
  for (const node of posts) {
    const author = adapter.getAuthor(node)
    const isHead = !!author && author.username !== prevUsername
    prevUsername = author?.username ?? null
    if (!isHead || node.querySelector('[data-treacon-btn]')) continue
    adapter.findButtonMount(node)?.append(makeButton(node))
  }
}

// --- Orkestrasi ---

let running = false

async function runReader(): Promise<void> {
  if (running) return
  running = true
  try {
    overlay.showProgress(0)
    const result = await extractThread((count) => overlay.showProgress(count))
    overlay.open(buildThread(result.posts, result.author, result.firstPostUrl, result.truncated))
  } catch (err) {
    console.error('[treacon]', err)
    overlay.showError(
      err instanceof ExtractError ? err.message : 'Terjadi kesalahan tak terduga.',
    )
  } finally {
    running = false
  }
}

function onReaderClick(node: HTMLElement): void {
  if (adapter.isPermalinkPage()) {
    void runReader()
    return
  }
  // Dari feed: navigasi lewat router SPA Threads (klik anchor permalink), BUKAN location.assign.
  // Tujuannya agar tombol back tetap SPA — feed sebelumnya tidak ikut ter-reload (spec §10).
  const anchor = adapter.getPostAnchor(node)
  if (!anchor) {
    overlay.showError('Link post tidak ditemukan.')
    return
  }
  void openViaSpaNav(anchor)
}

/** Buka permalink via router Threads lalu jalankan reader tanpa reload; fallback ke hard-nav. */
async function openViaSpaNav(anchor: HTMLAnchorElement): Promise<void> {
  const targetPath = new URL(anchor.href, location.origin).pathname
  overlay.showProgress(0)
  anchor.click() // pushState instan bila router menangani; kalau tidak, cek di bawah
  const navigated = await waitFor(() => location.pathname.startsWith(targetPath), 1500)
  if (!navigated) {
    // Router tak menangani klik (mis. Threads ubah markup) → fallback reload lewat flag.
    if (!requestAutoOpen(anchor.href)) overlay.showError('Link post tidak ditemukan.')
    return
  }
  const ready = await waitFor(() => adapter.getFocusedPostNode() !== null, 10_000)
  if (ready) void runReader()
  else overlay.showError('Post tidak kunjung termuat.')
}

async function boot(): Promise<void> {
  new MutationObserver(debounce(ensureButtons, 500)).observe(document.body, {
    childList: true,
    subtree: true,
  })
  ensureButtons()

  if (consumeAutoOpen()) {
    overlay.showProgress(0)
    const ready = await waitFor(() => adapter.getFocusedPostNode() !== null, 10_000)
    if (ready) void runReader()
    else overlay.showError('Post tidak kunjung termuat.')
  }
}

// hook recon untuk validasi selector via DevTools — hanya ada di dev build (`npm run dev`),
// tereliminasi statis dari build produksi
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__treacon = { adapter, extractThread, runReader }
}

void boot()
