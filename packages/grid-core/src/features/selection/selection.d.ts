import type { SelectionMode } from '../../model/GridConfig';
import type { GridSelection, SelectionIntent } from '../../model/GridState';
import { getRowRange } from '../../utils/range';
export declare function createEmptySelection(mode: SelectionMode): GridSelection;
export declare function getCellKey(rowIndex: number, columnKey: string): string;
export declare function getNextRowSelection(selection: GridSelection, mode: SelectionMode, rowIndex: number, intent: SelectionIntent): GridSelection | null;
export declare function getNextCellSelection(selection: GridSelection, mode: SelectionMode, rowIndex: number, columnKey: string): GridSelection | null;
export { getRowRange };
//# sourceMappingURL=selection.d.ts.map