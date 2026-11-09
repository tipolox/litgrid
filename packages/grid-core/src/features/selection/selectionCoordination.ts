import type { GridRowKey, GridState, SelectionChangeDetail } from '../../model/GridState.js'
import { createEmptySelection } from './selection.js'

function readKey(row: unknown, property: string): GridRowKey | null {
  const key = row != null && typeof row === 'object' ? Reflect.get(row, property) : null
  return typeof key === 'string' || (typeof key === 'number' && Number.isFinite(key)) ? key : null
}

/** Indexes are rebuilt on data/view transitions, never on individual clicks. */
export function createSelectionCoordination(state: GridState) {
  // Negative indexes mark ambiguous identities, including third/later duplicates.
  let sourceIndexes = new Map<GridRowKey, number>()
  let sourceKeys: Array<GridRowKey | null> = []
  let indexedProperty: string | undefined
  let sourceSelectableCount = 0
  let freshSourceIndexes = false
  let displayedSelectableCount = 0
  let displayedKeys = new Map<GridRowKey, number>()
  const listeners = new Set<(detail: SelectionChangeDetail) => void>()

  function keyAt(rowIndex: number): GridRowKey | null {
    const property = state.config.selection.rowKey
    if (property === undefined) return null
    const key = readKey(state.data[rowIndex], property)
    return key !== null && (sourceIndexes.get(key) ?? -1) >= 0 ? key : null
  }

  function snapshot(): SelectionChangeDetail {
    const selection = state.selection
    const indexes = new Set(selection.rowIndexes)
    for (const cell of selection.cells) indexes.add(Number(cell.slice(0, cell.indexOf(':'))))
    return Object.freeze({
      scopeKey: state.config.selection.scopeKey,
      mode: selection.mode,
      rowIndex: selection.rowIndex,
      columnKey: selection.columnKey,
      anchorRowIndex: selection.anchorRowIndex,
      rowIndexes: Object.freeze([...selection.rowIndexes]),
      cells: Object.freeze([...selection.cells]),
      rows: Object.freeze([...indexes].filter(index => Number.isInteger(index) && index >= 0 && index < state.data.length).map(rowIndex => Object.freeze({
        rowIndex, row: state.data[rowIndex], key: keyAt(rowIndex)
      })))
    })
  }

  let current = snapshot()
  function commit() {
    const next = snapshot()
    const sameScope = next.scopeKey === current.scopeKey || Object.is(next.scopeKey, current.scopeKey)
    if (sameScope && next.mode === current.mode && next.rowIndex === current.rowIndex &&
      next.columnKey === current.columnKey && next.anchorRowIndex === current.anchorRowIndex &&
      next.rowIndexes.length === current.rowIndexes.length &&
      next.rowIndexes.every((index, i) => index === current.rowIndexes[i]) &&
      next.cells.length === current.cells.length && next.cells.every((cell, i) => cell === current.cells[i]) &&
      next.rows.length === current.rows.length && next.rows.every((row, i) =>
        row.rowIndex === current.rows[i].rowIndex && row.key === current.rows[i].key && row.row === current.rows[i].row)) return
    current = next
    for (const listener of [...listeners]) listener(next)
  }

  function rebuildKeys() {
    const property = state.config.selection.rowKey
    freshSourceIndexes = true
    if (property === undefined) {
      sourceIndexes = new Map()
      sourceKeys = []
      indexedProperty = undefined
      sourceSelectableCount = 0
      return
    }

    // Array identity cannot prove validity: callers may mutate rows in place.
    // Check every identity synchronously, even for the same array/reference.
    const rows = state.originalData
    let firstChanged = 0
    let changedKey: GridRowKey | null = null
    let checkedChangedKey = false
    if (property === indexedProperty) {
      for (; firstChanged < Math.min(rows.length, sourceKeys.length); firstChanged++) {
        changedKey = readKey(rows[firstChanged], property)
        if (changedKey !== sourceKeys[firstChanged]) { checkedChangedKey = true; break }
      }
      if (firstChanged === rows.length && rows.length === sourceKeys.length) return
    }

    const nextKeys = sourceKeys.slice(0, firstChanged)
    const nextIndexes = new Map<GridRowKey, number>()
    let selectableCount = 0
    for (let index = 0; index < rows.length; index++) {
      const key = index < firstChanged ? nextKeys[index]
        : index === firstChanged && checkedChangedKey ? changedKey : readKey(rows[index], property)
      if (index >= firstChanged) nextKeys.push(key)
      if (key === null) continue
      const previous = nextIndexes.get(key)
      if (previous === undefined) { nextIndexes.set(key, index); selectableCount++ }
      else if (previous >= 0) { nextIndexes.set(key, -1); selectableCount-- }
    }
    sourceKeys = nextKeys
    sourceIndexes = nextIndexes
    sourceSelectableCount = selectableCount
    indexedProperty = property
  }

  function reconcile(originalOrder = false) {
    // Reuse only immediately after validation and when the engine guarantees
    // the complete original order. View changes otherwise read displayed keys.
    if (originalOrder && freshSourceIndexes) {
      displayedKeys = sourceIndexes
      displayedSelectableCount = sourceSelectableCount
    } else {
      // Avoid allocating another large Map when an existing complete display
      // index still describes every row in precisely the same position.
      // Never trust array identity: consumers can edit row keys in place.
      // Partial indexes (invalid or duplicate identities) and newly validated
      // source indexes use the original rebuild path.
      const reuseCandidate = !freshSourceIndexes &&
        state.config.selection.rowKey !== undefined &&
        state.config.selection.rowKey === indexedProperty &&
        displayedKeys.size > 0 && displayedKeys.size === state.data.length

      if (reuseCandidate) {
        let replacement: Map<GridRowKey, number> | null = null
        for (let index = 0; index < state.data.length; index++) {
          const key = keyAt(index)
          if (replacement === null && (key === null || displayedKeys.get(key) !== index)) {
            // Keys already checked at earlier positions match the old map.
            // Copy only that verified prefix, then process the remaining
            // rows once. Do not read getters/proxies a second time on a miss.
            replacement = new Map()
            for (const [priorKey, priorIndex] of displayedKeys) {
              if (priorIndex < index) replacement.set(priorKey, priorIndex)
            }
          }
          if (replacement !== null && key !== null) replacement.set(key, index)
        }
        if (replacement !== null) {
          displayedKeys = replacement
          displayedSelectableCount = replacement.size
        }
      } else {
        displayedKeys = new Map()
        if (state.config.selection.rowKey !== undefined) {
          for (let index = 0; index < state.data.length; index++) {
            const key = keyAt(index)
            if (key !== null) displayedKeys.set(key, index)
          }
        }
        displayedSelectableCount = displayedKeys.size
      }
    }
    freshSourceIndexes = false
    if (state.selection.rowIndexes.size) {
      const remap = new Map<number, number>()
      for (const row of current.rows) {
        const index = state.config.selection.rowKey !== undefined
          ? row.key === null ? undefined : indexForKey(row.key)
          : state.data[row.rowIndex] === row.row ? row.rowIndex : undefined
        if (index !== undefined) remap.set(row.rowIndex, index)
      }
      state.selection = {
        ...state.selection,
        rowIndexes: new Set([...state.selection.rowIndexes].flatMap(index => {
          const next = remap.get(index)
          return next === undefined ? [] : [next]
        })),
        rowIndex: remap.get(state.selection.rowIndex!) ?? null,
        anchorRowIndex: remap.get(state.selection.anchorRowIndex!) ?? null
      }
      if (!state.selection.rowIndexes.size) state.selection = createEmptySelection(state.selection.mode)
    } else if (state.selection.cells.size && current.rows.some(row =>
      state.data[row.rowIndex] !== row.row || keyAt(row.rowIndex) !== row.key)) {
      state.selection = createEmptySelection(state.selection.mode)
    }
    commit()
  }

  function indexForKey(key: GridRowKey) {
    const index = displayedKeys.get(key)
    return index !== undefined && index >= 0 ? index : undefined
  }

  function currentIndexForKey(key: GridRowKey) {
    const index = indexForKey(key)
    const sourceIndex = sourceIndexes.get(key)
    const property = state.config.selection.rowKey
    if (index === undefined || sourceIndex === undefined || sourceIndex < 0 ||
        property === undefined || state.originalData.length !== sourceKeys.length) return undefined
    // Displayed/transformed arrays are detached. A cached key alone cannot
    // prove that the reported row still occupies its validated source slot.
    // Check just that slot; unrelated, unreported mutations require refreshData.
    const row = state.originalData[sourceIndex]
    return row === state.data[index] && readKey(row, property) === key ? index : undefined
  }

  return {
    rebuildKeys, reconcile, commit,
    canSelect: (index: number) => Number.isInteger(index) && index >= 0 && index < state.data.length &&
      (state.config.selection.rowKey === undefined || keyAt(index) !== null),
    indexForKey, currentIndexForKey,
    getSelectableRowCount: () => state.config.selection.rowKey === undefined ? state.data.length : displayedSelectableCount,
    getSnapshot: () => current,
    subscribe(listener: (detail: SelectionChangeDetail) => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    }
  }
}
