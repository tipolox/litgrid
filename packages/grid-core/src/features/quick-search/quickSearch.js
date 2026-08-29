function normalizeQuery(query) {
    return query.trim().toLocaleLowerCase();
}
function matchesValue(value, query) {
    return ((typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint') &&
        String(value).toLocaleLowerCase().includes(query));
}
function matchesRow(row, query) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
        return Object.values(row).some((value) => matchesValue(value, query));
    }
    return matchesValue(row, query);
}
export function applyQuickSearch(data, query) {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
        return data.slice();
    }
    return data.filter((row) => matchesRow(row, normalizedQuery));
}
//# sourceMappingURL=quickSearch.js.map