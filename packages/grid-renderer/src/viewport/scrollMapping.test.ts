import { describe, expect, it } from 'vitest'
import { calculateDisplayLayout, mapDisplayScrollOffset } from './scrollMapping'

describe('scroll mapping', () => {
  it('maps scaled display scrolling and pins a downward bottom scroll to the virtual bottom', () => {
    expect(mapDisplayScrollOffset({
      displayScrollOffset: 450,
      previousDisplayScrollOffset: 400,
      displaySize: 500,
      totalSize: 10_000,
      viewportSize: 50
    })).toEqual({ availableDisplaySize: 450, availableVirtualSize: 9_950, scrollOffset: 9_950 })
  })

  it('clamps unscaled scrolling when no display range is available', () => {
    expect(mapDisplayScrollOffset({
      displayScrollOffset: 80,
      previousDisplayScrollOffset: 0,
      displaySize: 100,
      totalSize: 50,
      viewportSize: 100
    })).toEqual({ availableDisplaySize: 0, availableVirtualSize: 0, scrollOffset: 0 })
  })

  it('scales display layout and prevents the rendered block from exceeding the display size', () => {
    expect(calculateDisplayLayout({
      totalSize: 10_000,
      displaySize: 1_000,
      virtualOffsetTop: 9_900,
      visibleSize: 200,
      bottomPadding: 500
    })).toEqual({ displayScale: 0.1, displayOffsetTop: 800, displayBottomPadding: 50 })
  })
})
