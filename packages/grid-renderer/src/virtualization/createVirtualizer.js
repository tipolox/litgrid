import { clamp } from '../utils/math';
export function createVirtualizer({ rowHeight, viewportHeight, overscan = 4 }) {
    let state = {
        rowHeight,
        viewportHeight,
        overscan,
        scrollTop: 0
    };
    return {
        setOptions(next) {
            state = {
                ...state,
                ...next
            };
        },
        setScrollTop(scrollTop) {
            state.scrollTop = scrollTop;
        },
        setScrollOffset(scrollTop) {
            state.scrollTop = scrollTop;
        },
        getState(count) {
            const safeCount = Math.max(0, count);
            const safeRowHeight = Math.max(1, state.rowHeight);
            const safeViewportHeight = Math.max(0, state.viewportHeight);
            const safeOverscan = Math.max(0, state.overscan);
            const visibleCount = Math.max(1, Math.ceil(safeViewportHeight / safeRowHeight));
            const maxStartIndex = Math.max(0, safeCount - visibleCount);
            const baseStartIndex = clamp(Math.floor(state.scrollTop / safeRowHeight), 0, maxStartIndex);
            const startIndex = clamp(baseStartIndex - safeOverscan, 0, safeCount);
            const endIndex = clamp(baseStartIndex + visibleCount + safeOverscan, startIndex, safeCount);
            const offsetTop = startIndex * safeRowHeight;
            const totalHeight = safeCount * safeRowHeight;
            const visibleSize = (endIndex - startIndex) * safeRowHeight;
            return {
                startIndex,
                endIndex,
                offsetTop,
                bottomPadding: Math.max(0, totalHeight - endIndex * safeRowHeight),
                totalHeight,
                totalSize: totalHeight,
                visibleCount,
                visibleSize
            };
        }
    };
}
//# sourceMappingURL=createVirtualizer.js.map