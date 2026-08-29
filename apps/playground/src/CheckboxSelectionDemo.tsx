import { DataGrid } from '@tipolox/litgrid-react'
import type { GridTheme } from '@tipolox/litgrid-web'

const data = Array.from({ length: 36 }, (_, index) => ({
  id: index + 1,
  task: `Release checklist item ${index + 1}`,
  owner: ['Ana', 'Ben', 'Chin', 'Daria'][index % 4],
  status: ['Not started', 'In progress', 'Ready'][index % 3]
}))

const columns = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'task', header: 'Task', width: 280 },
  { key: 'owner', header: 'Owner', width: 140 },
  { key: 'status', header: 'Status', width: 160 }
]

export function CheckboxSelectionDemo({ theme }: { theme: GridTheme }) {
  return (
    <section className="demo-section">
      <p className="demo-description">
        Select individual rows, or use the header checkbox to select the current page. The header checkbox shows an indeterminate state for a partial selection.
      </p>
      <DataGrid
        data={data}
        columns={columns}
        config={{
          selection: { mode: 'multi-row', checkboxes: true },
          pagination: { enabled: true, pageSize: 12 }
        }}
        theme={theme}
        height={440}
        rowHeight={40}
      />
    </section>
  )
}
