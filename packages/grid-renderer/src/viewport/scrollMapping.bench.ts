import { bench, describe } from 'vitest'
import { calculateDisplayLayout, mapDisplayScrollOffset } from './scrollMapping'

const TOTAL_SIZE = 36_000_000
const DISPLAY_SIZE = 16_000_000
const VIEWPORT_SIZE = 720

describe('scroll mapping performance', () => {
  bench('maps a capped display scroll offset near the browser limit', () => {
    return mapDisplayScrollOffset({
      displayScrollOffset: DISPLAY_SIZE - VIEWPORT_SIZE,
      previousDisplayScrollOffset: DISPLAY_SIZE - VIEWPORT_SIZE - 36,
      displaySize: DISPLAY_SIZE,
      totalSize: TOTAL_SIZE,
      viewportSize: VIEWPORT_SIZE
    }).scrollOffset
  })

  bench('calculates a capped display layout near the browser limit', () => {
    return calculateDisplayLayout({
      totalSize: TOTAL_SIZE,
      displaySize: DISPLAY_SIZE,
      virtualOffsetTop: TOTAL_SIZE - 1_440,
      visibleSize: 720,
      bottomPadding: 720
    }).displayOffsetTop
  })
})
