import type { GridPaginationState } from '../../model/GridState'

export function getPageCount(totalRows: number, pageSize: number) {
  return totalRows === 0 ? 0 : Math.ceil(totalRows / pageSize)
}

export function clampPageIndex(pageIndex: number, pageCount: number) {
  return pageCount === 0 ? 0 : Math.min(Math.max(0, pageIndex), pageCount - 1)
}

export function createPaginationState(
  enabled: boolean,
  pageSize: number,
  pageIndex = 0,
  totalRows = 0
): GridPaginationState {
  const pageCount = getPageCount(totalRows, pageSize)

  return {
    enabled,
    pageSize,
    pageIndex: clampPageIndex(pageIndex, pageCount),
    totalRows,
    pageCount
  }
}

export function paginateData(data: unknown[], pagination: GridPaginationState) {
  if (!pagination.enabled) {
    return data
  }

  const start = pagination.pageIndex * pagination.pageSize
  return data.slice(start, start + pagination.pageSize)
}
