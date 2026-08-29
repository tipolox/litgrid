import type { GridSelection } from '@tipolox/litgrid-core';
import type { GridColumn } from '../types';
type SerializeSelectedCellsOptions = {
    selection: GridSelection;
    rows: unknown[];
    columns: GridColumn[];
    getCellValue: (column: GridColumn, row: unknown, rowIndex: number) => unknown;
    formatValue: (value: unknown) => string;
};
export declare function serializeSelectedCells({ selection, rows, columns, getCellValue, formatValue }: SerializeSelectedCellsOptions): string | null;
export {};
//# sourceMappingURL=serializeSelectedCells.d.ts.map