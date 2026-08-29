export type SelectionMode = 'none' | 'row' | 'multi-row' | 'cell' | 'multi-cell';
export type GridPaginationConfig = {
    enabled?: boolean;
    pageSize?: number;
    pageIndex?: number;
};
export type GridConfig = {
    selection?: {
        mode?: SelectionMode;
        checkboxes?: boolean;
    };
    rowHeader?: {
        enabled?: boolean;
        width?: number;
    };
    pagination?: GridPaginationConfig;
};
export type ResolvedGridConfig = {
    selection: {
        mode: SelectionMode;
        checkboxes: boolean;
    };
    rowHeader: {
        enabled: boolean;
        width: number;
    };
    pagination: {
        enabled: boolean;
        pageSize: number;
        pageIndex: number;
    };
};
export declare function normalizeConfig(config?: GridConfig): ResolvedGridConfig;
//# sourceMappingURL=GridConfig.d.ts.map