// Overlay reader (R3) + copy (R4) + surface progress/error — satu modul UI.
// Shadow DOM: isolasi dua arah dari CSS Threads. Teks post selalu via textContent,
// tidak pernah innerHTML (konten post = attacker-controlled).

import css from './overlay.css?inline'
import { toMarkdown, toPlainText, type MergedThread } from './pipeline'

let host: HTMLElement | null = null
let backdrop: HTMLElement | null = null
let savedOverflow: { html: string; body: string } | null = null

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
  }
}

function ensureOverlay(): HTMLElement {
  if (host && backdrop) {
    backdrop.replaceChildren()
    return backdrop
  }
  host = document.createElement('treacon-reader')
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647'
  const root = host.attachShadow({ mode: 'open' })
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  root.adoptedStyleSheets = [sheet]
  backdrop = el('div', 'backdrop')
  root.append(backdrop)
  document.body.append(host)

  savedOverflow = {
    html: document.documentElement.style.overflow,
    body: document.body.style.overflow,
  }
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  // capture: handler Threads tidak boleh menelan Esc
  document.addEventListener('keydown', onKeydown, true)
  return backdrop
}

export function close(): void {
  if (!host) return
  host.remove()
  host = null
  backdrop = null
  document.removeEventListener('keydown', onKeydown, true)
  if (savedOverflow) {
    document.documentElement.style.overflow = savedOverflow.html
    document.body.style.overflow = savedOverflow.body
    savedOverflow = null
  }
}

export function showProgress(count: number): void {
  const target = ensureOverlay()
  const status = el('div', 'status')
  status.append(
    el('h2', '', 'Memuat thread…'),
    el('p', '', count > 0 ? `${count} post ditemukan` : 'menyiapkan ekstraksi'),
  )
  target.append(status)
}

export function showError(message: string): void {
  const target = ensureOverlay()
  const status = el('div', 'status')
  const closeBtn = el('button', '', 'Tutup')
  closeBtn.addEventListener('click', close)
  status.append(
    el('h2', '', 'Reader tidak bisa membuka thread ini'),
    el('p', '', message),
    el(
      'p',
      '',
      'Threads mungkin baru mengubah tampilannya. Coba muat ulang halaman — kalau masih gagal, laporkan lewat halaman extension.',
    ),
    closeBtn,
  )
  target.append(status)
}

async function copyToClipboard(text: string, btn: HTMLButtonElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // fallback bila clipboard API ditolak (mis. Permissions-Policy halaman)
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.append(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  const original = btn.textContent
  btn.textContent = 'Tersalin ✓'
  btn.disabled = true
  setTimeout(() => {
    btn.textContent = original
    btn.disabled = false
  }, 1500)
}

export function open(thread: MergedThread): void {
  const target = ensureOverlay()
  const sheet = el('div', 'sheet')

  const topbar = el('div', 'topbar')
  const author = el('div', 'author', `${thread.author.name} `)
  author.append(el('span', 'username', `@${thread.author.username}`))
  const closeBtn = el('button', 'close', '✕')
  closeBtn.setAttribute('aria-label', 'Tutup reader')
  closeBtn.addEventListener('click', close)
  topbar.append(author, closeBtn)

  const meta = el(
    'div',
    'meta',
    `${thread.postCount} post · ±${thread.readingMinutes} menit baca`,
  )

  const body = el('div', 'body')
  for (const paragraph of thread.body.split('\n\n')) {
    body.append(el('p', '', paragraph))
  }

  const actions = el('div', 'actions')
  const copyMd = el('button', '', 'Copy sebagai Markdown')
  copyMd.addEventListener('click', () => copyToClipboard(toMarkdown(thread), copyMd))
  const copyTxt = el('button', '', 'Copy sebagai teks')
  copyTxt.addEventListener('click', () => copyToClipboard(toPlainText(thread), copyTxt))
  actions.append(copyMd, copyTxt)

  const source = el('a', 'source', 'Thread asli di Threads ↗')
  source.href = thread.firstPostUrl
  source.target = '_blank'
  source.rel = 'noopener'

  sheet.append(topbar, meta)
  if (thread.truncated) {
    sheet.append(
      el('div', 'notice', `Thread sangat panjang — hanya ${thread.postCount} post pertama yang dimuat.`),
    )
  }
  sheet.append(body, actions, source)
  target.append(sheet)
}
