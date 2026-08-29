import { getRowRange } from '../../utils/range';
export function createEmptySelection(mode) {
    return {
        mode,
        rowIndex: null,
        columnKey: null,
        anchorRowIndex: null,
        rowIndexes: new Set(),
        cells: new Set()
    };
}
export function getCellKey(rowIndex, columnKey) {
    return `${rowIndex}:${columnKey}`;
}
export function getNextRowSelection(selection, mode, rowIndex, intent) {
    if (mode === 'row') {
        return {
            ...createEmptySelection('row'),
            rowIndex,
            anchorRowIndex: rowIndex,
            rowIndexes: new Set([rowIndex])
        };
    }
    if (mode !== 'multi-row') {
        return null;
    }
    if (intent === 'range') {
        const anchorRowIndex = selection.anchorRowIndex ?? rowIndex;
        return {
            ...createEmptySelection('multi-row'),
            rowIndex,
            anchorRowIndex,
            rowIndexes: getRowRange(anchorRowIndex, rowIndex)
        };
    }
    if (intent === 'toggle') {
        const rowIndexes = new Set(selection.rowIndexes);
        if (rowIndexes.has(rowIndex)) {
            rowIndexes.delete(rowIndex);
        }
        else {
            rowIndexes.add(rowIndex);
        }
        return {
            ...createEmptySelection('multi-row'),
            rowIndex: rowIndexes.has(rowIndex) ? rowIndex : null,
            anchorRowIndex: rowIndex,
            rowIndexes
        };
    }
    return {
        ...createEmptySelection('multi-row'),
        rowIndex,
        anchorRowIndex: rowIndex,
        rowIndexes: new Set([rowIndex])
    };
}
export function getNextCellSelection(selection, mode, rowIndex, columnKey) {
    if (mode === 'cell') {
        return {
            ...createEmptySelection('cell'),
            rowIndex,
            columnKey,
            cells: new Set([getCellKey(rowIndex, columnKey)])
        };
    }
    if (mode !== 'multi-cell') {
        return null;
    }
    const cellKey = getCellKey(rowIndex, columnKey);
    const cells = new Set(selection.cells);
    if (cells.has(cellKey)) {
        cells.delete(cellKey);
    }
    else {
        cells.add(cellKey);
    }
    return {
        ...createEmptySelection('multi-cell'),
        rowIndex: cells.has(cellKey) ? rowIndex : null,
        columnKey: cells.has(cellKey) ? columnKey : null,
        cells
    };
}
export { getRowRange };
//# sourceMappingURL=selection.js.map