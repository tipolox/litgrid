import type { GridFilter, GridSortState } from '../../model/GridState.js'
import { applyFilterData } from '../filtering/filtering.js'
import { applyQuickSearch } from '../quick-search/quickSearch.js'
import { applySortData } from '../sorting/sorting.js'

export function applyDataTransforms(
  data: unknown[],
  quickSearchQuery: string,
  filters: GridFilter[],
  sort: GridSortState
) {
  // Each active transform already returns a detached array. Preserve that
  // contract with one copy, rather than three copies for an unchanged view.
  let result = data
  if (quickSearchQuery.trim()) result = applyQuickSearch(result, quickSearchQuery)
  if (filters.length) result = applyFilterData(result, filters)
  if (sort.columnKey && sort.direction) result = applySortData(result, sort)
  return result === data ? data.slice() : result
}
