export function getRowRange(startIndex, endIndex) {
    const firstIndex = Math.min(startIndex, endIndex);
    const lastIndex = Math.max(startIndex, endIndex);
    const rowIndexes = new Set();
    for (let index = firstIndex; index <= lastIndex; index += 1) {
        rowIndexes.add(index);
    }
    return rowIndexes;
}
//# sourceMappingURL=range.js.map