import { bench, describe } from 'vitest'
import { createVariableVirtualizer } from './createVariableVirtualizer'
import { createVirtualizer } from './createVirtualizer'

const ROW_COUNT = 1_000_000
const VARIABLE_ROW_COUNT = 100_000
const fixedVirtualizer = createVirtualizer({
  rowHeight: 36,
  viewportHeight: 720,
  overscan: 4
})
const variableSizes = Array.from(
  { length: VARIABLE_ROW_COUNT },
  (_, index) => 28 + (index % 5) * 4
)
const variableVirtualizer = createVariableVirtualizer({
  sizes: variableSizes,
  viewportSize: 720,
  overscan: 2
})

describe('virtualizer performance', () => {
  bench('calculates fixed-height ranges for 1,000,000 rows', () => {
    fixedVirtualizer.setScrollOffset(18_000_000)

    return fixedVirtualizer.getState(ROW_COUNT).endIndex
  })

  bench('calculates variable-height ranges for 100,000 rows', () => {
    variableVirtualizer.setScrollOffset(1_800_000)

    return variableVirtualizer.getState().endIndex
  })
})
