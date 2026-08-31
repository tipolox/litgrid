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
  return applySortData(applyFilterData(applyQuickSearch(data, quickSearchQuery), filters), sort)
}
