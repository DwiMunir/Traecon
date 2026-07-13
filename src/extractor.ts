// Ekstraksi self-thread (R2): backtrack ke akar rangkaian, lalu loop lazy-load
// sampai rangkaian lengkap. Akumulasi keyed by postUrl agar tahan list virtualization.

import * as adapter from './adapter'
import type { Author, ThreadPost } from './pipeline'

export type ExtractErrorCode = 'no-focused-post' | 'no-author' | 'zero-posts'

export class ExtractError extends Error {
  constructor(
    public code: ExtractErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export const POST_CAP = 100 // spec §8: batas aman thread >50 post
const MAX_ITERATIONS = 40
const MAX_HOPS = 10
const SETTLE_QUIET_MS = 300
const SETTLE_TIMEOUT_MS = 4000
const WALL_CLOCK_MS = 60_000

const AUTO_KEY = 'treacon:auto'
const HOP_KEY = 'treacon:hops'

export interface ExtractResult {
  posts: ThreadPost[]
  author: Author
  firstPostUrl: string
  truncated: boolean
}

// --- Flag auto-open (consume-once) untuk redirect feed→permalink & hop backtrack ---

/** Navigasi ke url dan minta reader terbuka otomatis di sana. False jika cap hop tercapai. */
export function requestAutoOpen(url: string): boolean {
  const hops = Number(sessionStorage.getItem(HOP_KEY) ?? '0')
  if (hops >= MAX_HOPS) return false
  sessionStorage.setItem(HOP_KEY, String(hops + 1))
  sessionStorage.setItem(AUTO_KEY, new URL(url, location.origin).pathname)
  location.assign(url)
  return true
}

/** Cek + hapus flag auto-open untuk halaman ini. */
export function consumeAutoOpen(): boolean {
  const target = sessionStorage.getItem(AUTO_KEY)
  if (!target || target !== location.pathname) return false
  sessionStorage.removeItem(AUTO_KEY)
  return true
}

// --- Ekstraksi ---

export async function extractThread(
  onProgress: (count: number) => void,
): Promise<ExtractResult> {
  // Fase A: temukan akar rangkaian
  const focused = adapter.getFocusedPostNode()
  if (!focused) throw new ExtractError('no-focused-post', 'Post tidak ditemukan di halaman ini.')
  const author = adapter.getAuthor(focused)
  if (!author) throw new ExtractError('no-author', 'Author post tidak terbaca.')

  let nodes = adapter.getColumnPosts()
  let rootIdx = Math.max(0, nodes.indexOf(focused))
  while (rootIdx > 0 && adapter.isSameAuthor(nodes[rootIdx - 1], author)) rootIdx--
  const rootNode = nodes[rootIdx] ?? focused
  const rootUrl = adapter.getPostUrl(rootNode)

  // Masih ada ancestor yang belum ter-render → hop ke permalink akar (spec §10)
  if (
    rootUrl &&
    adapter.isReplyingToSomething(rootNode) &&
    new URL(rootUrl).pathname !== location.pathname
  ) {
    if (requestAutoOpen(rootUrl)) return new Promise(() => {}) // halaman akan berganti
  }

  // Fase B: koleksi maju dari akar
  const collected = new Map<string, ThreadPost>()
  const startY = window.scrollY
  const deadline = Date.now() + WALL_CLOCK_MS
  let truncated = false
  let stale = 0

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const scan = scanChain(collected, author)
      onProgress(collected.size)

      if (collected.size >= POST_CAP) {
        truncated = true
        break
      }
      stale = scan.newCount === 0 ? stale + 1 : 0
      const moreBtn = adapter.findShowMoreButton()
      if (stale >= 2 && !moreBtn) break
      if (stale >= 4) break // beberapa pass sunyi = rantai kemungkinan besar sudah lengkap
      if (Date.now() > deadline) break

      scan.tailNode?.scrollIntoView({ block: 'end' })
      moreBtn?.click()
      await settle()
    }
  } finally {
    window.scrollTo(0, startY)
  }

  if (collected.size === 0) {
    throw new ExtractError('zero-posts', 'Tidak ada post yang berhasil diekstrak.')
  }
  sessionStorage.removeItem(HOP_KEY)
  // sort "Populer" bisa mengacak urutan grup — kronologi timestamp = urutan rangkaian asli (R2)
  const posts = [...collected.values()].sort((a, b) =>
    a.timestamp && b.timestamp ? a.timestamp.localeCompare(b.timestamp) : 0,
  )
  return { posts, author, firstPostUrl: posts[0].postUrl || rootUrl || location.href, truncated }
}

interface ScanResult {
  newCount: number
  tailNode: HTMLElement | null
}

/**
 * Satu pass atas post yang ter-render: tambah post rantai author baru ke `collected`.
 * Per grup reply: grup yang diawali post author = bagian rantai (sort "Populer" bisa
 * menyelakan reply orang lain di antara grup — tidak boleh memutus rantai). Grup yang
 * diawali post akun lain di-skip seluruhnya, termasuk balasan author ke commenter di dalamnya.
 * Limitation v1: balasan author ke commenter yang nested DI DALAM grup rantai ikut terambil.
 */
function scanChain(collected: Map<string, ThreadPost>, author: Author): ScanResult {
  let newCount = 0
  let tailNode: HTMLElement | null = null
  let lastUrl = ''

  for (const group of adapter.getPostGroups()) {
    if (!adapter.isSameAuthor(group[0], author)) continue
    for (const node of group) {
      // ponytail: placeholder post terhapus belum tertangkap getColumnPosts — validasi live dulu
      if (adapter.isUnavailablePost(node)) {
        const key = `unavailable-after:${lastUrl}`
        if (!collected.has(key)) {
          collected.set(key, { text: '', mediaUrls: [], postUrl: '', timestamp: '', unavailable: true })
          newCount++
        }
        continue
      }
      const url = adapter.getPostUrl(node)
      if (!url) continue
      if (!adapter.isSameAuthor(node, author)) continue // reply akun lain nested di grup rantai (R2)
      tailNode = node
      lastUrl = url
      if (adapter.isQuoteOrRepost(node)) continue // spec §8: quote/repost author sendiri → skip
      if (!collected.has(url)) {
        const post = adapter.extractPost(node)
        if (post) {
          collected.set(url, post)
          newCount++
        }
      }
    }
  }

  return { newCount, tailNode }
}

/** Tunggu DOM tenang: 300ms tanpa mutasi, hard stop 4s. */
function settle(): Promise<void> {
  return new Promise((resolve) => {
    let quiet: ReturnType<typeof setTimeout>
    const done = () => {
      observer.disconnect()
      clearTimeout(quiet)
      clearTimeout(hardStop)
      resolve()
    }
    const observer = new MutationObserver(() => {
      clearTimeout(quiet)
      quiet = setTimeout(done, SETTLE_QUIET_MS)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    quiet = setTimeout(done, SETTLE_QUIET_MS)
    const hardStop = setTimeout(done, SETTLE_TIMEOUT_MS)
  })
}
