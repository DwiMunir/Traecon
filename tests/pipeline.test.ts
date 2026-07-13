import { describe, expect, it } from 'vitest'
import {
  buildThread,
  mergePosts,
  shouldJoinInline,
  stripMarkers,
  toMarkdown,
  toPlainText,
  UNAVAILABLE_TEXT,
  type Author,
  type ThreadPost,
} from '../src/pipeline'

const post = (text: string, extra: Partial<ThreadPost> = {}): ThreadPost => ({
  text,
  mediaUrls: [],
  postUrl: 'https://www.threads.com/@user/post/abc',
  timestamp: '2026-07-01T00:00:00.000Z',
  ...extra,
})

const author: Author = { name: 'Nama', username: 'user' }

describe('stripMarkers — leading', () => {
  it.each([
    ['1/5 Ini pembuka', 'Ini pembuka'],
    ['(2/7) lanjutan cerita', 'lanjutan cerita'],
    ['[3/9] teks', 'teks'],
    ['2 of 7 — sebuah teks', 'sebuah teks'],
    ['2 dari 7 sebuah teks', 'sebuah teks'],
    ['🧵 Mari bahas', 'Mari bahas'],
    ['🧵 1/5 combo marker', 'combo marker'],
    ['1/5: dengan titik dua', 'dengan titik dua'],
  ])('%j → %j', (input, expected) => {
    expect(stripMarkers(input)).toBe(expected)
  })
})

describe('stripMarkers — trailing', () => {
  it.each([
    ['teks bersambung 2/7', 'teks bersambung'],
    ['akhir teks (3/9)', 'akhir teks'],
    ['sampai sini cont.', 'sampai sini'],
    ['sampai sini (cont)', 'sampai sini'],
    ['ceritanya lanjut...', 'ceritanya'],
    ['ceritanya lanjut…', 'ceritanya'],
    ['ceritanya (lanjut)', 'ceritanya'],
    ['ceritanya lanjutan...', 'ceritanya'],
    ['baca terus 👇', 'baca terus'],
    ['baca terus — 2/7', 'baca terus'],
  ])('%j → %j', (input, expected) => {
    expect(stripMarkers(input)).toBe(expected)
  })
})

describe('stripMarkers — bukan marker (negatif)', () => {
  it.each([
    'Besok kita lanjut.',
    'Ceritanya masih berlanjut...',
    'Skor 3/4 dari juri masih dihitung',
    'Musim 2020/2021 adalah puncaknya',
    'Rating film itu 3/4.',
  ])('%j tetap utuh', (input) => {
    expect(stripMarkers(input)).toBe(input)
  })

  it('post yang hanya marker → string kosong', () => {
    expect(stripMarkers('2/7')).toBe('')
    expect(stripMarkers('🧵')).toBe('')
  })
})

describe('shouldJoinInline', () => {
  it('prev tanpa punctuation + next huruf kecil → join', () => {
    expect(shouldJoinInline('karena dia', 'tidak tahu')).toBe(true)
  })

  it.each(['Selesai.', 'Kenapa?', 'Wow!', 'Yaitu:', 'Hmm…', 'Dia bilang "ya."'])(
    'prev %j berakhir terminal → paragraf baru',
    (prev) => {
      expect(shouldJoinInline(prev, 'lanjutannya')).toBe(false)
    },
  )

  it('prev berakhir emoji → paragraf baru (emoji-heavy, spec §8)', () => {
    expect(shouldJoinInline('mantap 🎉', 'lanjut kecil')).toBe(false)
    expect(shouldJoinInline('selesai 🚀✨', 'lanjut kecil')).toBe(false)
  })

  it('next diawali kapital / digit / emoji → paragraf baru', () => {
    expect(shouldJoinInline('karena dia', 'Tapi begini')).toBe(false)
    expect(shouldJoinInline('karena dia', '3 hal penting')).toBe(false)
    expect(shouldJoinInline('karena dia', '🎉 perayaan')).toBe(false)
  })
})

describe('mergePosts', () => {
  it('default: gabung dengan satu baris kosong', () => {
    expect(mergePosts([post('Paragraf satu.'), post('Paragraf dua.')])).toBe(
      'Paragraf satu.\n\nParagraf dua.',
    )
  })

  it('kalimat terpotong → join satu spasi', () => {
    expect(mergePosts([post('karena dia belum'), post('tahu apa-apa.')])).toBe(
      'karena dia belum tahu apa-apa.',
    )
  })

  it('marker di-strip sebelum join', () => {
    expect(mergePosts([post('1/2 Awal cerita.'), post('2/2 Akhir cerita.')])).toBe(
      'Awal cerita.\n\nAkhir cerita.',
    )
  })

  it('thread 1 post = passthrough (degenerate, spec §8)', () => {
    expect(mergePosts([post('Cuma satu post.')])).toBe('Cuma satu post.')
  })

  it('post terhapus → placeholder sebagai paragraf sendiri', () => {
    expect(mergePosts([post('Awal tanpa titik'), post('', { unavailable: true }), post('akhir.')])).toBe(
      `Awal tanpa titik\n\n${UNAVAILABLE_TEXT}\n\nakhir.`,
    )
  })

  it('post yang hanya marker dilewati', () => {
    expect(mergePosts([post('Isi utama.'), post('🧵'), post('Penutup.')])).toBe(
      'Isi utama.\n\nPenutup.',
    )
  })

  it('whitespace cleanup: trailing space + collapse baris kosong', () => {
    expect(mergePosts([post('baris satu  \n\n\n\nbaris dua  ')])).toBe('baris satu\n\nbaris dua')
  })
})

describe('output (R4)', () => {
  const thread = buildThread(
    [post('Isi thread.')],
    author,
    'https://www.threads.com/@user/post/abc',
  )

  it('markdown: header sekali + footer link', () => {
    expect(toMarkdown(thread)).toBe(
      '**Nama (@user)**\n\nIsi thread.\n\n---\n[Thread asli di Threads](https://www.threads.com/@user/post/abc)',
    )
  })

  it('plaintext: tanpa sintaks markdown', () => {
    const text = toPlainText(thread)
    expect(text).toBe(
      'Nama (@user)\n\nIsi thread.\n\nThread asli: https://www.threads.com/@user/post/abc',
    )
    expect(text).not.toContain('**')
  })

  it('reading time minimal 1 menit', () => {
    expect(thread.readingMinutes).toBe(1)
  })

  it('reading time ~kata/200', () => {
    const long = buildThread([post(Array(600).fill('kata').join(' '))], author, 'u')
    expect(long.readingMinutes).toBe(3)
  })
})
