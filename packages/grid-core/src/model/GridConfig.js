function normalizePageSize(value) {
    return Number.isFinite(value) && value > 0 ? Math.max(1, Math.floor(value)) : 50;
}
function normalizePageIndex(value) {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}
export function normalizeConfig(config = {}) {
    return {
        selection: {
            mode: config.selection?.mode ?? 'none',
            checkboxes: config.selection?.checkboxes ?? false
        },
        rowHeader: {
            enabled: config.rowHeader?.enabled ?? false,
            width: config.rowHeader?.width ?? 56
        },
        pagination: {
            enabled: config.pagination?.enabled ?? false,
            pageSize: normalizePageSize(config.pagination?.pageSize),
            pageIndex: normalizePageIndex(config.pagination?.pageIndex)
        }
    };
}
//# sourceMappingURL=GridConfig.js.map