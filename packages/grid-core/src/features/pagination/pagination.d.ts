import type { GridPaginationState } from '../../model/GridState';
export declare function getPageCount(totalRows: number, pageSize: number): number;
export declare function clampPageIndex(pageIndex: number, pageCount: number): number;
export declare function createPaginationState(enabled: boolean, pageSize: number, pageIndex?: number, totalRows?: number): GridPaginationState;
export declare function paginateData(data: unknown[], pagination: GridPaginationState): unknown[];
//# sourceMappingURL=pagination.d.ts.map