import { DataGrid } from '@tipolox/litgrid-react'
import type { GridTheme } from '@tipolox/litgrid-web'

const data = Array.from({ length: 127 }, (_, index) => ({
  id: index + 1,
  customer: ['Aster Labs', 'Beacon Works', 'Cedar Systems', 'Delta Studio'][index % 4],
  status: ['Queued', 'Running', 'Complete', 'Failed'][index % 4],
  owner: ['Ana', 'Ben', 'Chin', 'Daria', 'Eli'][index % 5],
  total: 1250 + ((index * 137) % 8500)
}))

const columns = [
  { key: 'id', header: 'Order', width: 100 },
  { key: 'customer', header: 'Customer', width: 220 },
  { key: 'status', header: 'Status', width: 140 },
  { key: 'owner', header: 'Owner', width: 140 },
  {
    key: 'total',
    header: 'Total',
    width: 140,
    render: (value: unknown) => `$${Number(value).toLocaleString()}`
  }
]

export function PaginationDemo({ theme }: { theme: GridTheme }) {
  return (
    <section className="demo-section">
      <p className="demo-description">
        Browse 127 orders. Use a column menu to show the Quick Search bar above the grid, or sort and filter to see pagination update.
      </p>
      <DataGrid
        data={data}
        columns={columns}
        config={{
          rowHeader: { enabled: true, width: 56 },
          pagination: { enabled: true, pageSize: 25 },
          selection: { mode: 'row' as const }
        }}
        theme={theme}
        height={440}
        rowHeight={40}
      />
    </section>
  )
}
