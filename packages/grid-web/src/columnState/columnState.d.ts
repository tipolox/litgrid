import type { GridColumn } from '../types';
export type GridColumnStateColumn = {
    key: string;
    width?: number;
    visible: boolean;
};
export type GridColumnState = {
    version: 1;
    columns: GridColumnStateColumn[];
};
export type ColumnStateChangeDetail = {
    reason: 'resize' | 'reorder' | 'visibility' | 'restore' | 'reset' | 'set';
    state: GridColumnState;
};
export type ResolvedColumnState = {
    columns: GridColumn[];
    widths: Map<string, number>;
    hiddenKeys: Set<string>;
};
export declare function createColumnState(columns: GridColumn[], widths: Map<string, number>, hiddenKeys: Set<string>): GridColumnState;
export declare function resolveColumnState(state: unknown, sourceColumns: GridColumn[]): ResolvedColumnState | null;
export declare function parseColumnState(value: string | null): GridColumnState | null;
//# sourceMappingURL=columnState.d.ts.map