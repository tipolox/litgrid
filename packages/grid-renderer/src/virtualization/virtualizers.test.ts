import { describe, expect, it } from 'vitest'
import { createVariableVirtualizer } from './createVariableVirtualizer.js'
import { createVirtualizer } from './createVirtualizer.js'
import { mapDisplayScrollOffset } from '../viewport/scrollMapping.js'

describe('virtualizers', () => {
  it('calculates a fixed-row range with overscan', () => {
    const virtualizer = createVirtualizer({
      rowHeight: 20,
      viewportHeight: 40,
      overscan: 1
    })

    virtualizer.setScrollOffset(45)

    expect(virtualizer.getState(10)).toEqual({
      startIndex: 1,
      endIndex: 5,
      offsetTop: 20,
      bottomPadding: 100,
      totalHeight: 200,
      totalSize: 200,
      visibleCount: 2,
      visibleSize: 80
    })
  })

  it('calculates a variable-row range and padding with overscan', () => {
    const virtualizer = createVariableVirtualizer({
      sizes: [10, 20, 30, 40, 50],
      viewportSize: 20,
      overscan: 1
    })

    virtualizer.setScrollOffset(35)

    expect(virtualizer.getState()).toEqual({
      startIndex: 1,
      endIndex: 4,
      leftPadding: 10,
      rightPadding: 50,
      offsetTop: 10,
      bottomPadding: 50,
      totalSize: 150,
      visibleSize: 90
    })
  })

  it('maps the display bottom to the virtual scroll bottom', () => {
    expect(mapDisplayScrollOffset({
      displayScrollOffset: 900,
      previousDisplayScrollOffset: 899,
      displaySize: 1000,
      totalSize: 10000,
      viewportSize: 100
    })).toEqual({
      availableDisplaySize: 900,
      availableVirtualSize: 9900,
      scrollOffset: 9900
    })
  })

  it('keeps fixed virtual ranges valid for empty data and invalid dimensions', () => {
    const virtualizer = createVirtualizer({
      rowHeight: 0,
      viewportHeight: -20,
      overscan: -1
    })
    virtualizer.setScrollOffset(-100)

    expect(virtualizer.getState(0)).toEqual({
      startIndex: 0,
      endIndex: 0,
      offsetTop: 0,
      bottomPadding: 0,
      totalHeight: 0,
      totalSize: 0,
      visibleCount: 1,
      visibleSize: 0
    })
  })

  it('clamps variable virtual ranges at the scroll boundaries', () => {
    const virtualizer = createVariableVirtualizer({
      sizes: [10, 20, 30],
      viewportSize: 10,
      overscan: 1
    })

    virtualizer.setScrollOffset(-10)
    expect(virtualizer.getState()).toMatchObject({
      startIndex: 0,
      endIndex: 2,
      leftPadding: 0,
      rightPadding: 30,
      totalSize: 60
    })

    virtualizer.setScrollOffset(1000)
    expect(virtualizer.getState()).toMatchObject({
      startIndex: 2,
      endIndex: 3,
      leftPadding: 30,
      rightPadding: 0,
      visibleSize: 30
    })
  })
})
