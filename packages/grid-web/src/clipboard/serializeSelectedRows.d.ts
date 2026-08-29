import type { GridSelection } from '@tipolox/litgrid-core';
import type { GridColumn } from '../types';
type SerializeSelectedRowsOptions = {
    selection: GridSelection;
    rows: unknown[];
    columns: GridColumn[];
    getCellValue: (column: GridColumn, row: unknown, rowIndex: number) => unknown;
    formatValue: (value: unknown) => string;
};
export declare function serializeSelectedRows({ selection, rows, columns, getCellValue, formatValue }: SerializeSelectedRowsOptions): string | null;
export {};
//# sourceMappingURL=serializeSelectedRows.d.ts.map