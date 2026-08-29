import { bench, describe } from 'vitest'
import { createGridEngine } from './createGridEngine'

type BenchmarkRow = {
  id: number
  name: string
  status: 'active' | 'inactive'
  amount: number
}

const ROW_COUNT = 100_000
const rows: BenchmarkRow[] = Array.from({ length: ROW_COUNT }, (_, index) => ({
  id: index,
  name: `Customer ${index}`,
  status: index % 5 === 0 ? 'inactive' : 'active',
  amount: (index * 17) % 10_000
}))

describe('GridEngine performance', () => {
  bench('sets 100,000 rows', () => {
    const engine = createGridEngine()
    engine.setData(rows)

    return engine.getTotalRowCount()
  })

  bench('applies quick search, filter, sort, and pagination to 100,000 rows', () => {
    const engine = createGridEngine({
      pagination: { enabled: true, pageSize: 100 }
    })

    engine.setData(rows)
    engine.setQuickSearch('Customer 1')
    engine.setFilter({ columnKey: 'status', operator: 'equals', value: 'active' })
    engine.sortBy('amount', 'desc')
    engine.setPage(10)

    return engine.getRows().length
  })
})
