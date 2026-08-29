import { clamp, sumSizes } from '../utils/math';
export function createVariableVirtualizer({ sizes, viewportSize, overscan = 2 }) {
    let state = {
        sizes,
        viewportSize,
        overscan,
        scrollOffset: 0
    };
    return {
        setOptions(next) {
            state = {
                ...state,
                ...next
            };
        },
        setScrollOffset(scrollOffset) {
            state.scrollOffset = scrollOffset;
        },
        getState() {
            const sizes = state.sizes.map((size) => Math.max(1, size));
            const count = sizes.length;
            const totalSize = sumSizes(sizes, 0, count);
            const safeViewportSize = Math.max(0, state.viewportSize);
            const safeOverscan = Math.max(0, state.overscan);
            const safeScrollOffset = clamp(state.scrollOffset, 0, totalSize);
            let baseStartIndex = 0;
            let baseStartOffset = 0;
            while (baseStartIndex < count &&
                baseStartOffset + sizes[baseStartIndex] <= safeScrollOffset) {
                baseStartOffset += sizes[baseStartIndex];
                baseStartIndex += 1;
            }
            let visibleEndIndex = baseStartIndex;
            let visibleEndOffset = baseStartOffset;
            while (visibleEndIndex < count &&
                visibleEndOffset < safeScrollOffset + safeViewportSize) {
                visibleEndOffset += sizes[visibleEndIndex];
                visibleEndIndex += 1;
            }
            const startIndex = clamp(baseStartIndex - safeOverscan, 0, count);
            const endIndex = clamp(visibleEndIndex + safeOverscan, startIndex, count);
            const leftPadding = sumSizes(sizes, 0, startIndex);
            const visibleSize = sumSizes(sizes, startIndex, endIndex);
            const rightPadding = Math.max(0, totalSize - leftPadding - visibleSize);
            return {
                startIndex,
                endIndex,
                leftPadding,
                rightPadding,
                offsetTop: leftPadding,
                bottomPadding: rightPadding,
                totalSize,
                visibleSize
            };
        }
    };
}
//# sourceMappingURL=createVariableVirtualizer.js.map