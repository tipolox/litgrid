import { html } from 'lit'
import { DataGrid } from '@tipolox/litgrid-react'
import type { GridTheme } from '@tipolox/litgrid-web'

type Project = {
  id: string
  name: string
  owner: string
  status: 'On track' | 'At risk' | 'Blocked'
  progress: number
  budget: number
}

const data: Project[] = [
  { id: 'PRJ-104', name: 'Customer portal', owner: 'Ana', status: 'On track', progress: 78, budget: 84200 },
  { id: 'PRJ-118', name: 'Mobile refresh', owner: 'Ben', status: 'At risk', progress: 46, budget: 61500 },
  { id: 'PRJ-123', name: 'Data migration', owner: 'Chin', status: 'Blocked', progress: 31, budget: 127000 },
  { id: 'PRJ-131', name: 'Usage analytics', owner: 'Daria', status: 'On track', progress: 91, budget: 38400 },
  { id: 'PRJ-144', name: 'Partner API', owner: 'Eli', status: 'At risk', progress: 63, budget: 75900 }
]

const statusColors = {
  'On track': { background: '#dcfce7', color: '#166534' },
  'At risk': { background: '#fef3c7', color: '#92400e' },
  Blocked: { background: '#fee2e2', color: '#991b1b' }
} as const

const columns = [
  { key: 'id', header: 'Project', width: 110 },
  { key: 'name', header: 'Name', width: 210 },
  {
    key: 'owner',
    header: 'Owner',
    width: 160,
    render: (value: unknown) => html`<span style="font-weight: 600">${String(value)}</span>`
  },
  {
    key: 'status',
    header: 'Status',
    width: 150,
    render: (value: unknown) => {
      const status = value as Project['status']
      const colors = statusColors[status]
      return html`<span style="display: inline-block; border-radius: 999px; padding: 3px 8px; background: ${colors.background}; color: ${colors.color}; font-size: 12px; font-weight: 700">${status}</span>`
    }
  },
  {
    key: 'progress',
    header: 'Progress',
    width: 170,
    render: (value: unknown) => {
      const progress = Number(value)
      return html`<span style="display: inline-flex; align-items: center; gap: 7px; min-width: 132px">
        <span style="display: inline-block; overflow: hidden; width: 88px; height: 7px; border-radius: 999px; background: var(--litgrid-border)">
          <span style="display: block; width: ${progress}%; height: 100%; border-radius: inherit; background: var(--litgrid-accent)"></span>
        </span>
        <span>${progress}%</span>
      </span>`
    }
  },
  {
    key: 'budget',
    header: 'Budget',
    width: 150,
    render: (value: unknown) => html`<span style="display: inline-flex; align-items: center; gap: 5px">
      <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="8" cy="8" r="6"></circle><path d="M10.2 5.8c-.4-.5-1.1-.8-2-.8-1.1 0-1.9.6-1.9 1.4 0 2.1 3.8.9 3.8 3 0 .9-.8 1.5-2 1.5-1 0-1.8-.4-2.2-1"></path><path d="M8 3.8v8.4"></path>
      </svg>
      ${Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
    </span>`
  }
]

export function CustomRendererDemo({ theme }: { theme: GridTheme }) {
  return (
    <section className="demo-section">
      <p className="demo-description">
        Lit template renderers add status badges, progress bars, and SVG icons. Sorting, filtering, and clipboard copying still use each column&apos;s underlying value.
      </p>
      <DataGrid
        data={data}
        columns={columns}
        config={{ rowHeader: { enabled: true, width: 56 }, selection: { mode: 'row' } }}
        theme={theme}
        height={360}
        rowHeight={48}
      />
    </section>
  )
}
