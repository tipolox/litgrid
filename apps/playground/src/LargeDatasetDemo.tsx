import { DataGrid } from '@tipolox/litgrid-react'
import type { GridTheme } from '@tipolox/litgrid-web'

const data = Array.from({ length: 1_000_000 }, (_, index) => ({
  id: index,
  name: `Row ${index}`,
  status: ['Queued', 'Running', 'Complete', 'Failed'][index % 4],
  priority: ['Low', 'Medium', 'High', 'Urgent'][index % 4],
  owner: ['Ana', 'Ben', 'Chin', 'Daria', 'Eli'][index % 5],
  region: ['North', 'South', 'East', 'West'][index % 4],
  category: ['Hardware', 'Software', 'Services'][index % 3],
  progress: `${(index * 7) % 100}%`,
  total: (index * 37) % 1000,
  budget: 2500 + ((index * 113) % 9000),
  updatedAt: `2026-06-${String((index % 28) + 1).padStart(2, '0')}`,
  notes: `Batch ${Math.floor(index / 250) + 1}`
}))

const columns = [
  { key: 'id', header: 'ID', width: 88 },
  { key: 'name', header: 'Name', width: 220 },
  { key: 'status', header: 'Status', width: 140 },
  { key: 'priority', header: 'Priority', width: 140 },
  { key: 'owner', header: 'Owner', width: 140 },
  { key: 'region', header: 'Region', width: 140 },
  { key: 'category', header: 'Category', width: 160 },
  { key: 'progress', header: 'Progress', width: 140 },
  { key: 'total', header: 'Total', width: 120 },
  { key: 'budget', header: 'Budget', width: 140 },
  { key: 'updatedAt', header: 'Updated', width: 150 },
  { key: 'notes', header: 'Notes', width: 180 }
]

const config = {
  selection: { mode: 'multi-row' as const },
  rowHeader: { enabled: true, width: 64 }
}

export function LargeDatasetDemo({ theme }: { theme: GridTheme }) {
  return (
    <section className="demo-section">
      <p className="demo-description">
        One million rows demonstrate virtual row and column rendering. Scroll in either direction and select rows without mounting the full dataset.
      </p>
      <DataGrid
        data={data}
        columns={columns}
        config={config}
        theme={theme}
        height={480}
        rowHeight={40}
        overscan={6}
        columnOverscan={2}
      />
    </section>
  )
}
