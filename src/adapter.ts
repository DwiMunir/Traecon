// SATU-SATUNYA file yang tahu struktur DOM Threads (spec §7).
// Strategi: pegang ke <time datetime>, bentuk URL /@user/post/{id}, role/aria —
// jangan pernah class name obfuscated. Kalau Meta mengubah DOM, patch di sini saja.
// Semua fungsi return null/[] saat gagal; caller yang memutuskan error UX.

import type { Author, ThreadPost } from './pipeline'

const POST_PATH = /^\/@?[\w.]+\/post\/[\w-]+/
const PROFILE_PATH = /^\/@[\w.]+\/?$/

export function isPermalinkPage(pathname = location.pathname): boolean {
  return POST_PATH.test(pathname)
}

function pathnameOf(a: HTMLAnchorElement): string {
  try {
    return new URL(a.href, location.origin).pathname
  } catch {
    return ''
  }
}

/** Anchor permalink post: <a href=".../post/..."> yang memuat <time datetime>. */
function timeAnchors(root: ParentNode = document): HTMLAnchorElement[] {
  return [...root.querySelectorAll<HTMLAnchorElement>('a[href*="/post/"]')].filter(
    (a) => POST_PATH.test(pathnameOf(a)) && a.querySelector('time[datetime]'),
  )
}

/** Naik dari anchor ke batas container post. */
function postContainerOf(el: HTMLElement): HTMLElement | null {
  const pressable = el.closest<HTMLElement>('[data-pressable-container]')
  if (pressable) return pressable
  // fallback: naik sampai parent memuat lebih dari satu <time> (= sudah melewati batas post)
  let node: HTMLElement | null = el
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement
    if (!parent || parent === document.body || parent.querySelectorAll('time[datetime]').length > 1)
      return node
    node = parent
  }
  return null
}

/** Post unit yang ter-render di kolom utama, urut dokumen. Quote (post dalam post) tidak diikutkan sebagai unit sendiri. */
export function getColumnPosts(): HTMLElement[] {
  const candidates = new Set<HTMLElement>()
  for (const a of timeAnchors()) {
    const c = postContainerOf(a)
    if (c) candidates.add(c)
  }
  const all = [...candidates]
  return all
    .filter((c) => !all.some((other) => other !== c && other.contains(c)))
    .sort((x, y) =>
      x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
}

/**
 * Kelompokkan post per "grup reply": kolom = leluhur bersama terdalam semua post,
 * grup = anak langsung kolom yang memuat post tsb. Rantai self-thread = grup yang
 * diawali post author; balasan author ke commenter tinggal di grup milik commenter.
 */
export function getPostGroups(): HTMLElement[][] {
  const posts = getColumnPosts()
  if (posts.length <= 1) return posts.length ? [posts] : []
  let column: HTMLElement = posts[0]
  while (!posts.every((p) => column.contains(p))) {
    if (!column.parentElement) break
    column = column.parentElement
  }
  const groups = new Map<HTMLElement, HTMLElement[]>()
  for (const p of posts) {
    let wrapper: HTMLElement = p
    while (wrapper.parentElement && wrapper.parentElement !== column) {
      wrapper = wrapper.parentElement
    }
    groups.set(wrapper, [...(groups.get(wrapper) ?? []), p])
  }
  return [...groups.values()] // Map = urutan insert = urutan dokumen
}

export function getPostUrl(node: HTMLElement): string | null {
  const a = timeAnchors(node)[0]
  if (!a) return null
  const url = new URL(a.href, location.origin)
  return `${url.origin}${url.pathname}`
}

export function getAuthor(node: HTMLElement): Author | null {
  const links = [...node.querySelectorAll<HTMLAnchorElement>('a[href]')].filter((a) =>
    PROFILE_PATH.test(pathnameOf(a)),
  )
  if (!links.length) return null
  const username = pathnameOf(links[0]).replace(/^\/@/, '').replace(/\/$/, '')
  const name =
    links.map((a) => a.textContent?.trim()).find((t) => t && !t.startsWith('@')) ||
    links.map((a) => a.getAttribute('aria-label')?.trim()).find(Boolean) ||
    username
  return { name, username }
}

export function isSameAuthor(node: HTMLElement, author: Author): boolean {
  return getAuthor(node)?.username === author.username
}

/** Quote/repost milik author di dalam post → v1 skip (spec §8): post yang memuat post lain. */
export function isQuoteOrRepost(node: HTMLElement): boolean {
  return timeAnchors(node).length > 1
}

/** Placeholder post terhapus. Bentuk pastinya divalidasi live; heuristik teks dulu. */
export function isUnavailablePost(node: HTMLElement): boolean {
  if (timeAnchors(node).length > 0) return false
  const text = node.textContent ?? ''
  return /unavailable|tidak tersedia|telah dihapus|deleted/i.test(text) && text.length < 200
}

/** Post yang sedang dibuka pada halaman permalink. */
export function getFocusedPostNode(): HTMLElement | null {
  const path = location.pathname
  for (const a of timeAnchors()) {
    if (pathnameOf(a) === path || path.startsWith(pathnameOf(a))) {
      return postContainerOf(a)
    }
  }
  return null
}

/**
 * Indikator masih ada ancestor yang TIDAK ter-render di atas post ini
 * (mis. "See earlier replies" / thread line ke atas). Divalidasi live.
 */
export function isReplyingToSomething(node: HTMLElement): boolean {
  return /replying to|membalas/i.test(node.textContent?.slice(0, 300) ?? '')
}

/** Tombol "View more"/"Show more replies" di bawah rangkaian. */
export function findShowMoreButton(): HTMLElement | null {
  const buttons = [
    ...document.querySelectorAll<HTMLElement>('[role="button"], button'),
  ].filter((b) => {
    const t = b.textContent?.trim() ?? ''
    return (
      t.length < 60 &&
      /(view|show|see|load|lihat|tampilkan|muat)\s.*(more|replies|repl|activity|lainnya|balasan|lanjut)/i.test(
        t,
      )
    )
  })
  return buttons.find((b) => b.offsetParent !== null) ?? null
}

// Chip UI Threads yang bisa menempel di dalam blok teks yang sama dengan konten
// (temuan live recon): label translate, sort, composer, angka engagement, "1 / 10",
// timestamp relatif. Dibuang per-baris. Risiko: baris konten yang murni angka ikut
// terbuang — jarang, diterima untuk v1.
const UI_LINE = new RegExp(
  [
    String.raw`^(terjemahkan|translate|populer|top|lihat aktivitas|view activity)$`,
    String.raw`^(balas ke|reply to)\s.*$`,
    String.raw`^[\d.,]+\s*(rb|jt|k|m|b)?$`, // angka engagement: 5,7 rb · 67
    String.raw`^[/·]$`, // pecahan chip "1 / 10"
    String.raw`^\d+\s*(dtk|mnt|menit|jam|hari|mgg|minggu|bln|bulan|thn|tahun|[smhdw])$`, // 22 jam · 3h
  ].join('|'),
  'i',
)

function cleanupUiLines(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !UI_LINE.test(line))
    .join('\n')
}

export function extractPost(node: HTMLElement): ThreadPost | null {
  const postUrl = getPostUrl(node)
  if (!postUrl) return null
  const timeEl = node.querySelector('time[datetime]')
  const timestamp = timeEl?.getAttribute('datetime') ?? ''

  // Teks post: blok [dir="auto"] paling luar, di luar elemen interaktif/header
  // dan di luar quote container (post dalam post).
  const innerQuote = quoteContainerIn(node)
  const blocks = [...node.querySelectorAll<HTMLElement>('[dir="auto"]')].filter((el) => {
    if (el.closest('a, button, [role="button"], [role="textbox"], [contenteditable="true"], time'))
      return false
    if (el.querySelector('time[datetime]')) return false // baris header (username · timestamp)
    if (innerQuote && innerQuote.contains(el)) return false
    const parentAuto = el.parentElement?.closest('[dir="auto"]')
    return !parentAuto || !node.contains(parentAuto)
  })
  const text = cleanupUiLines(
    blocks
      // chip translate bisa jadi descendant blok teks → innerText memuatnya inline di ujung
      .map((b) => (b.innerText ?? '').replace(/\s*(terjemahkan|translate)\s*$/i, '').trim())
      .filter(Boolean)
      .join('\n'),
  )

  // Media untuk P1 — avatar (img di dalam link profil / alt foto profil) di-skip.
  const mediaUrls = [
    ...[...node.querySelectorAll<HTMLImageElement>('img[src]')]
      .filter((img) => {
        const a = img.closest('a')
        if (a && PROFILE_PATH.test(pathnameOf(a))) return false // avatar
        return !/profile|foto profil/i.test(img.alt ?? '')
      })
      .map((img) => img.src),
    ...[...node.querySelectorAll<HTMLVideoElement>('video')].map(
      (v) => v.src || v.querySelector('source')?.src || '',
    ),
  ].filter(Boolean)

  return { text, mediaUrls, postUrl, timestamp }
}

function quoteContainerIn(node: HTMLElement): HTMLElement | null {
  if (!isQuoteOrRepost(node)) return null
  const anchors = timeAnchors(node)
  // quote = container milik anchor kedua dst yang masih di dalam node
  for (const a of anchors.slice(1)) {
    const c = postContainerOf(a)
    if (c && c !== node && node.contains(c)) return c
  }
  return null
}

/** Titik mount tombol reader: baris header yang memuat anchor timestamp. */
export function findButtonMount(node: HTMLElement): HTMLElement | null {
  return timeAnchors(node)[0]?.parentElement ?? null
}
