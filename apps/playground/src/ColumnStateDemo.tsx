import { useCallback, useState } from 'react'
import { DataGrid } from '@tipolox/litgrid-react'
import type { ColumnStateChangeDetail, GridTheme } from '@tipolox/litgrid-web'

const storageKey = 'litgrid-playground-account-users'

const data = [
  { id: 'USR-104', name: 'Ada Lovelace', team: 'Platform', role: 'Administrator', status: 'Active' },
  { id: 'USR-118', name: 'Grace Hopper', team: 'Engineering', role: 'Maintainer', status: 'Active' },
  { id: 'USR-127', name: 'Katherine Johnson', team: 'Analytics', role: 'Analyst', status: 'Away' },
  { id: 'USR-135', name: 'Alan Turing', team: 'Research', role: 'Contributor', status: 'Active' },
  { id: 'USR-142', name: 'Evelyn Boyd Granville', team: 'Platform', role: 'Maintainer', status: 'Inactive' }
]

const columns = [
  { key: 'id', header: 'User ID', width: 110 },
  { key: 'name', header: 'Name', width: 220 },
  { key: 'team', header: 'Team', width: 160 },
  { key: 'role', header: 'Role', width: 160 },
  { key: 'status', header: 'Status', width: 130 }
]

export function ColumnStateDemo({ theme }: { theme: GridTheme }) {
  const [changeSummary, setChangeSummary] = useState('No saved changes in this session.')

  const handleColumnStateChange = useCallback((detail: ColumnStateChangeDetail) => {
    setChangeSummary(
      `Saved ${detail.state.columns.length} column preferences (version ${detail.state.version}).`
    )
  }, [])

  return (
    <section className="demo-section">
      <p className="demo-description">
        Resize or reorder headers, then use a header menu to hide a column. The React callback observes the Web Component state change, and the grid restores these preferences after a refresh.
      </p>
      <p className="demo-status" role="status">{changeSummary}</p>
      <DataGrid
        data={data}
        columns={columns}
        config={{ selection: { mode: 'row' } }}
        theme={theme}
        ariaLabel="Account users with saved column preferences"
        columnStateStorageKey={storageKey}
        onColumnStateChange={handleColumnStateChange}
        height={360}
      />
    </section>
  )
}
