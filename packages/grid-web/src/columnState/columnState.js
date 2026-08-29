import { normalizeColumnWidth } from '../sizing/columnSizing';
export function createColumnState(columns, widths, hiddenKeys) {
    return {
        version: 1,
        columns: columns.map((column) => {
            const width = widths.get(column.key);
            return {
                key: column.key,
                ...(width === undefined ? {} : { width }),
                visible: !hiddenKeys.has(column.key)
            };
        })
    };
}
export function resolveColumnState(state, sourceColumns) {
    if (!isGridColumnState(state))
        return null;
    const sourceByKey = new Map(sourceColumns.map((column) => [column.key, column]));
    const consumedKeys = new Set();
    const columns = [];
    const widths = new Map();
    const hiddenKeys = new Set();
    for (const entry of state.columns) {
        const column = sourceByKey.get(entry.key);
        if (!column || consumedKeys.has(entry.key))
            continue;
        consumedKeys.add(entry.key);
        columns.push(column);
        if (!entry.visible)
            hiddenKeys.add(entry.key);
        if (typeof entry.width === 'number' && Number.isFinite(entry.width)) {
            widths.set(entry.key, normalizeColumnWidth(entry.width));
        }
    }
    for (const column of sourceColumns) {
        if (consumedKeys.has(column.key))
            continue;
        columns.push(column);
        if (column.hidden)
            hiddenKeys.add(column.key);
    }
    return { columns, widths, hiddenKeys };
}
export function parseColumnState(value) {
    if (!value)
        return null;
    try {
        const state = JSON.parse(value);
        return isGridColumnState(state) ? state : null;
    }
    catch {
        return null;
    }
}
function isGridColumnState(value) {
    if (!value || typeof value !== 'object')
        return false;
    const state = value;
    if (state.version !== 1 || !Array.isArray(state.columns))
        return false;
    return state.columns.every((column) => {
        if (!column || typeof column !== 'object')
            return false;
        const entry = column;
        return typeof entry.key === 'string' &&
            typeof entry.visible === 'boolean' &&
            (entry.width === undefined || typeof entry.width === 'number');
    });
}
//# sourceMappingURL=columnState.js.map