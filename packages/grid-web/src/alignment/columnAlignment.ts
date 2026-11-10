import type { GridColumn } from '../types.js'

/** Stage validation and detached metadata before the active schema is changed. */
export function prepareAlignedColumns(columns: GridColumn[]) {
  const alignments = new Map<string, string>()
  const keys = new Set<string>()
  const snapshots = columns.map(column => {
    try {
      if (keys.has(column.key)) throw new TypeError('Duplicate column schema key.')
      keys.add(column.key)
      if ('align' in column) {
        const descriptor = Object.getOwnPropertyDescriptor(column, 'align')
        if (!descriptor || !('value' in descriptor)) throw new TypeError('Alignment must be an own data property.')
        if (descriptor.value !== undefined && !['start', 'center', 'end', 'left', 'right'].includes(descriptor.value)) {
          throw new TypeError('Invalid alignment.')
        }
      }
      const snapshot = { ...column }
      if (snapshot.align) alignments.set(snapshot.key, 'cell-align-' + snapshot.align)
      return snapshot
    } catch (error) {
      const failure = new TypeError(`Column ${JSON.stringify(column.key)}: ${error instanceof Error ? error.message : String(error)}`)
      failure.name = 'GridColumnAlignmentError'
      throw failure
    }
  })
  return { columns: snapshots, alignments }
}
