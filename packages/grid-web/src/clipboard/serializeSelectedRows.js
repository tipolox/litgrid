function isRowSelection(selection) {
    return selection.mode === 'row' || selection.mode === 'multi-row';
}
export function serializeSelectedRows({ selection, rows, columns, getCellValue, formatValue }) {
    if (!isRowSelection(selection) || selection.rowIndexes.size === 0) {
        return null;
    }
    const selectedRowIndexes = [...selection.rowIndexes]
        .filter((rowIndex) => Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < rows.length)
        .sort((left, right) => left - right);
    if (selectedRowIndexes.length === 0) {
        return null;
    }
    return selectedRowIndexes.map((rowIndex) => {
        const row = rows[rowIndex];
        return columns
            .map((column) => formatValue(getCellValue(column, row, rowIndex)))
            .join('\t');
    }).join('\n');
}
//# sourceMappingURL=serializeSelectedRows.js.map