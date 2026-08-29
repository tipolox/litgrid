import { normalizeConfig } from '../model/GridConfig';
import { createEmptySelection, getCellKey, getNextCellSelection, getNextRowSelection } from '../features/selection/selection';
import { applyDataTransforms } from '../features/transforms/applyDataTransforms';
import { clampPageIndex, createPaginationState, paginateData } from '../features/pagination/pagination';
export function createGridEngine(config = {}) {
    const initialConfig = normalizeConfig(config);
    let state = {
        config: initialConfig,
        originalData: [],
        transformedData: [],
        data: [],
        sort: { columnKey: null, direction: null },
        quickSearchQuery: '',
        filters: [],
        pagination: createPaginationState(initialConfig.pagination.enabled, initialConfig.pagination.pageSize, initialConfig.pagination.pageIndex),
        selection: createEmptySelection(initialConfig.selection.mode)
    };
    function refreshData() {
        state.transformedData = applyDataTransforms(state.originalData, state.quickSearchQuery, state.filters, state.sort);
        const pageCount = Math.ceil(state.transformedData.length / state.pagination.pageSize);
        state.pagination = {
            ...state.pagination,
            totalRows: state.transformedData.length,
            pageCount,
            pageIndex: clampPageIndex(state.pagination.pageIndex, pageCount)
        };
        state.data = paginateData(state.transformedData, state.pagination);
    }
    function resetPage() {
        state.pagination = { ...state.pagination, pageIndex: 0 };
    }
    return {
        setConfig(config) {
            const nextConfig = normalizeConfig(config);
            state.config = nextConfig;
            state.pagination = createPaginationState(nextConfig.pagination.enabled, nextConfig.pagination.pageSize, nextConfig.pagination.pageIndex, state.transformedData.length);
            refreshData();
            if (state.selection.mode !== nextConfig.selection.mode) {
                state.selection = createEmptySelection(nextConfig.selection.mode);
            }
        },
        getConfig() {
            return state.config;
        },
        setData(data) {
            state.originalData = data ?? [];
            resetPage();
            refreshData();
        },
        getRows() {
            return state.data;
        },
        setQuickSearch(query) {
            state.quickSearchQuery = typeof query === 'string' ? query : '';
            resetPage();
            refreshData();
        },
        clearQuickSearch() {
            state.quickSearchQuery = '';
            resetPage();
            refreshData();
        },
        getQuickSearch() {
            return state.quickSearchQuery;
        },
        setFilter(filter) {
            state.filters = [
                ...state.filters.filter((item) => item.columnKey !== filter.columnKey),
                { ...filter }
            ];
            resetPage();
            refreshData();
        },
        clearFilter(columnKey) {
            state.filters = columnKey
                ? state.filters.filter((item) => item.columnKey !== columnKey)
                : [];
            resetPage();
            refreshData();
        },
        getFilters() {
            return state.filters.slice();
        },
        setPage(pageIndex) {
            const nextPageIndex = Number.isFinite(pageIndex) ? Math.max(0, Math.floor(pageIndex)) : 0;
            state.pagination = {
                ...state.pagination,
                pageIndex: clampPageIndex(nextPageIndex, state.pagination.pageCount)
            };
            state.data = paginateData(state.transformedData, state.pagination);
        },
        setPageSize(pageSize) {
            if (!Number.isFinite(pageSize) || pageSize <= 0) {
                return;
            }
            state.pagination = {
                ...state.pagination,
                pageSize: Math.max(1, Math.floor(pageSize)),
                pageIndex: 0
            };
            refreshData();
        },
        getPagination() {
            return { ...state.pagination };
        },
        getTotalRowCount() {
            return state.pagination.totalRows;
        },
        sortBy(columnKey, direction) {
            state.sort = { columnKey, direction };
            resetPage();
            refreshData();
        },
        clearSort() {
            state.sort = { columnKey: null, direction: null };
            resetPage();
            refreshData();
        },
        getSort() {
            return state.sort;
        },
        getRowCount() {
            return state.data.length;
        },
        getVisibleRows(startIndex, endIndex) {
            return state.data.slice(startIndex, endIndex);
        },
        selectRow(rowIndex, intent = 'replace') {
            const nextSelection = getNextRowSelection(state.selection, state.config.selection.mode, rowIndex, intent);
            if (nextSelection) {
                state.selection = nextSelection;
            }
        },
        selectAllRows() {
            if (state.config.selection.mode !== 'multi-row') {
                return;
            }
            const rowIndexes = new Set();
            for (let rowIndex = 0; rowIndex < state.data.length; rowIndex += 1) {
                rowIndexes.add(rowIndex);
            }
            state.selection = {
                ...createEmptySelection('multi-row'),
                rowIndex: state.data.length > 0 ? state.data.length - 1 : null,
                anchorRowIndex: state.data.length > 0 ? 0 : null,
                rowIndexes
            };
        },
        selectCell(rowIndex, columnKey) {
            const nextSelection = getNextCellSelection(state.selection, state.config.selection.mode, rowIndex, columnKey);
            if (nextSelection) {
                state.selection = nextSelection;
            }
        },
        clearSelection() {
            state.selection = createEmptySelection(state.config.selection.mode);
        },
        getSelection() {
            return state.selection;
        },
        isRowSelected(rowIndex) {
            return ((state.selection.mode === 'row' || state.selection.mode === 'multi-row') &&
                state.selection.rowIndexes.has(rowIndex));
        },
        isCellSelected(rowIndex, columnKey) {
            return ((state.selection.mode === 'cell' || state.selection.mode === 'multi-cell') &&
                state.selection.cells.has(getCellKey(rowIndex, columnKey)));
        }
    };
}
//# sourceMappingURL=createGridEngine.js.map