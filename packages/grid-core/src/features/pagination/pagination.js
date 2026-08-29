export function getPageCount(totalRows, pageSize) {
    return totalRows === 0 ? 0 : Math.ceil(totalRows / pageSize);
}
export function clampPageIndex(pageIndex, pageCount) {
    return pageCount === 0 ? 0 : Math.min(Math.max(0, pageIndex), pageCount - 1);
}
export function createPaginationState(enabled, pageSize, pageIndex = 0, totalRows = 0) {
    const pageCount = getPageCount(totalRows, pageSize);
    return {
        enabled,
        pageSize,
        pageIndex: clampPageIndex(pageIndex, pageCount),
        totalRows,
        pageCount
    };
}
export function paginateData(data, pagination) {
    if (!pagination.enabled) {
        return data;
    }
    const start = pagination.pageIndex * pagination.pageSize;
    return data.slice(start, start + pagination.pageSize);
}
//# sourceMappingURL=pagination.js.map