function isCellSelection(selection) {
    return selection.mode === 'cell' || selection.mode === 'multi-cell';
}
export function serializeSelectedCells({ selection, rows, columns, getCellValue, formatValue }) {
    if (!isCellSelection(selection) || selection.cells.size === 0) {
        return null;
    }
    const selectedRows = [];
    const selectedColumns = [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
            if (selection.cells.has(`${rowIndex}:${columns[columnIndex].key}`)) {
                selectedRows.push(rowIndex);
                selectedColumns.push(columnIndex);
            }
        }
    }
    if (selectedRows.length === 0 || selectedColumns.length === 0) {
        return null;
    }
    const firstRowIndex = Math.min(...selectedRows);
    const lastRowIndex = Math.max(...selectedRows);
    const firstColumnIndex = Math.min(...selectedColumns);
    const lastColumnIndex = Math.max(...selectedColumns);
    return Array.from({ length: lastRowIndex - firstRowIndex + 1 }, (_, rowOffset) => {
        const rowIndex = firstRowIndex + rowOffset;
        const row = rows[rowIndex];
        return Array.from({ length: lastColumnIndex - firstColumnIndex + 1 }, (_, columnOffset) => {
            const column = columns[firstColumnIndex + columnOffset];
            if (!selection.cells.has(`${rowIndex}:${column.key}`)) {
                return '';
            }
            return formatValue(getCellValue(column, row, rowIndex));
        }).join('\t');
    }).join('\n');
}
//# sourceMappingURL=serializeSelectedCells.js.map