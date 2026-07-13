// Pipeline normalisasi & merge (spec §6). Murni — tanpa DOM, unit-tested.
// Single source of truth: overlay dan copy sama-sama mengkonsumsi MergedThread.

export interface ThreadPost {
  text: string
  mediaUrls: string[]
  postUrl: string
  timestamp: string
  unavailable?: boolean
}

export interface Author {
  name: string
  username: string
}

export interface MergedThread {
  author: Author
  body: string
  firstPostUrl: string
  postCount: number
  readingMinutes: number
  truncated: boolean
}

export const UNAVAILABLE_TEXT = '[post tidak tersedia]'

// --- Strip penanda numbering (spec §6.1) ---

// 1/5 · (2/7) · [3/9] · 2 of 7 · 2 dari 7
const COUNTER = String.raw`[([]?\s*\d{1,3}\s*(?:/|of|dari)\s*\d{1,3}\s*[)\]]?`
// cont · cont. · continued · (cont) — \b agar "viscont" dkk tak terpotong
const CONT = String.raw`\(?\s*\bcont(?:inued)?\s*\.?\s*\)?`
// lanjut/lanjutan wajib ellipsis (2+ titik / …) atau kurung — "…kita lanjut." dan "berlanjut..." bukan marker
const LANJUT = String.raw`(?:\(\s*lanjut(?:an)?\s*\.{0,3}\s*\)|\blanjut(?:an)?\s*(?:\.{2,}|…))`
const EMOJI_MARKER = String.raw`(?:\u{1F9F5}|\u{1F447})` // 🧵 👇
const MARKER = `(?:${COUNTER}|${CONT}|${LANJUT}|${EMOJI_MARKER})`

const LEADING_MARKER = new RegExp(`^(?:\\s*${MARKER}\\s*[:.\\-–—»]?\\s*)+`, 'iu')
const TRAILING_MARKER = new RegExp(`(?:\\s*[-–—«(]?\\s*${MARKER}\\s*\\)?)+\\s*$`, 'iu')

export function stripMarkers(text: string): string {
  return text.replace(LEADING_MARKER, '').replace(TRAILING_MARKER, '').trim()
}

// --- Join heuristic (spec §6.2) ---

const TERMINAL_PUNCT = /[.!?:…‼⁉]["”’)\]]?\s*$/u
const TERMINAL_EMOJI = new RegExp(
  '\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic})*\\s*$',
  'u',
)
const STARTS_LOWERCASE = /^\p{Ll}/u

export function shouldJoinInline(prev: string, next: string): boolean {
  const terminal = TERMINAL_PUNCT.test(prev) || TERMINAL_EMOJI.test(prev)
  return !terminal && STARTS_LOWERCASE.test(next)
}

// --- Merge ---

export function mergePosts(posts: ThreadPost[]): string {
  const parts: string[] = []
  for (const post of posts) {
    const text = post.unavailable ? UNAVAILABLE_TEXT : stripMarkers(post.text)
    if (!text) continue
    const prev = parts[parts.length - 1]
    // placeholder post terhapus selalu paragraf sendiri, tak pernah di-join
    if (prev !== undefined && prev !== UNAVAILABLE_TEXT && shouldJoinInline(prev, text)) {
      parts[parts.length - 1] = `${prev} ${text}`
    } else {
      parts.push(text)
    }
  }
  return parts
    .join('\n\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function buildThread(
  posts: ThreadPost[],
  author: Author,
  firstPostUrl: string,
  truncated = false,
): MergedThread {
  const body = mergePosts(posts)
  const words = body ? body.trim().split(/\s+/).length : 0
  return {
    author,
    body,
    firstPostUrl,
    postCount: posts.length,
    readingMinutes: Math.max(1, Math.round(words / 200)),
    truncated,
  }
}

// --- Output (R4) ---

export function toMarkdown(t: MergedThread): string {
  return `**${t.author.name} (@${t.author.username})**\n\n${t.body}\n\n---\n[Thread asli di Threads](${t.firstPostUrl})`
}

export function toPlainText(t: MergedThread): string {
  return `${t.author.name} (@${t.author.username})\n\n${t.body}\n\nThread asli: ${t.firstPostUrl}`
}
