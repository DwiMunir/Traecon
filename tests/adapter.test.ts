import { describe, expect, it } from 'vitest'
import { SHOW_MORE_RE } from '../src/adapter'

describe('SHOW_MORE_RE — tombol load-more rantai', () => {
  it.each([
    'View more replies',
    'Show more',
    'See more replies',
    'Load more',
    'Lihat balasan lainnya',
    'Muat lanjut',
  ])('cocok: %j', (t) => {
    expect(SHOW_MORE_RE.test(t)).toBe(true)
  })

  // Ini pembuka modal engagement, bukan load-more — klik-nya menumpuk overlay Threads.
  it.each(['View activity', 'Post activity', 'Lihat aktiviti', 'Sort'])(
    'TIDAK boleh cocok: %j',
    (t) => {
      expect(SHOW_MORE_RE.test(t)).toBe(false)
    },
  )
})
