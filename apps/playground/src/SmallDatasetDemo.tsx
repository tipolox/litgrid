import { DataGrid } from '@tipolox/litgrid-react'
import type { GridTheme } from '@tipolox/litgrid-web'

const data = [
  { id: 1001, customer: 'Aster Labs', status: 'In progress', owner: 'Ana', total: 1840 },
  { id: 1002, customer: 'Beacon Works', status: 'Ready', owner: 'Ben', total: 2630 },
  { id: 1003, customer: 'Cedar Systems', status: 'Blocked', owner: 'Chin', total: 925 },
  { id: 1004, customer: 'Delta Studio', status: 'In progress', owner: 'Daria', total: 4120 },
  { id: 1005, customer: 'Elm & Co.', status: 'Ready', owner: 'Eli', total: 1530 },
  { id: 1006, customer: 'Aster Labs', status: 'Queued', owner: 'Ben', total: 760 },
  { id: 1007, customer: 'Beacon Works', status: 'In progress', owner: 'Chin', total: 3280 },
  { id: 1008, customer: 'Cedar Systems', status: 'Ready', owner: 'Daria', total: 2175 },
  { id: 1009, customer: 'Delta Studio', status: 'Queued', owner: 'Eli', total: 1190 },
  { id: 1010, customer: 'Elm & Co.', status: 'Blocked', owner: 'Ana', total: 845 },
  { id: 1011, customer: 'Aster Labs', status: 'Ready', owner: 'Chin', total: 2960 },
  { id: 1012, customer: 'Beacon Works', status: 'In progress', owner: 'Daria', total: 3715 }
]

const columns = [
  { key: 'id', header: 'Order', width: 100 },
  { key: 'customer', header: 'Customer', width: 220 },
  { key: 'status', header: 'Status', width: 150 },
  { key: 'owner', header: 'Owner', width: 140 },
  {
    key: 'total',
    header: 'Total',
    width: 140,
    render: (value: unknown) => `$${Number(value).toLocaleString()}`
  }
]

export function SmallDatasetDemo({ theme }: { theme: GridTheme }) {
  return (
    <section className="demo-section">
      <p className="demo-description">
        A compact order list for everyday grids. Select a row, sort or filter a column, and use a column menu to show Quick Search.
      </p>
      <DataGrid
        data={data}
        columns={columns}
        config={{
          rowHeader: { enabled: true, width: 56 },
          selection: { mode: 'row' }
        }}
        theme={theme}
        height={440}
        rowHeight={40}
      />
    </section>
  )
}
