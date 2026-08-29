import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants';
export function normalizeColumnWidth(width) {
    return Math.max(MIN_COLUMN_WIDTH, width);
}
export function resolveColumnWidth(column, resizedWidth) {
    if (resizedWidth) {
        return resizedWidth;
    }
    if (typeof column.width === 'number') {
        return column.width;
    }
    if (typeof column.width === 'string' && /^\d+px$/.test(column.width)) {
        return Number.parseInt(column.width, 10);
    }
    return DEFAULT_COLUMN_WIDTH;
}
//# sourceMappingURL=columnSizing.js.map