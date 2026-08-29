import type { GridFilter, GridSortState } from '../../model/GridState'
import { applyFilterData } from '../filtering/filtering'
import { applyQuickSearch } from '../quick-search/quickSearch'
import { applySortData } from '../sorting/sorting'

export function applyDataTransforms(
  data: unknown[],
  quickSearchQuery: string,
  filters: GridFilter[],
  sort: GridSortState
) {
  return applySortData(applyFilterData(applyQuickSearch(data, quickSearchQuery), filters), sort)
}
