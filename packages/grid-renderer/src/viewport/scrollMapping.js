import { clamp } from '../utils/math';
export function mapDisplayScrollOffset({ displayScrollOffset, previousDisplayScrollOffset, displaySize, totalSize, viewportSize }) {
    const availableDisplaySize = Math.max(0, displaySize - viewportSize);
    const availableVirtualSize = Math.max(0, totalSize - viewportSize);
    if (totalSize > 0 && availableDisplaySize > 0 && availableVirtualSize > 0) {
        const ratio = displayScrollOffset / availableDisplaySize;
        const desiredScrollOffset = ratio * availableVirtualSize;
        let scrollOffset = clamp(Number.isFinite(desiredScrollOffset) ? desiredScrollOffset : 0, 0, availableVirtualSize);
        const bottomThreshold = 1;
        const isScrollingDown = displayScrollOffset >= previousDisplayScrollOffset;
        if (isScrollingDown && displayScrollOffset >= Math.max(0, availableDisplaySize - bottomThreshold)) {
            scrollOffset = availableVirtualSize;
        }
        return { availableDisplaySize, availableVirtualSize, scrollOffset };
    }
    return {
        availableDisplaySize,
        availableVirtualSize,
        scrollOffset: clamp(displayScrollOffset, 0, availableVirtualSize)
    };
}
export function calculateDisplayLayout({ totalSize, displaySize, virtualOffsetTop, visibleSize, bottomPadding }) {
    const displayScale = totalSize > 0 ? displaySize / totalSize : 1;
    return {
        displayScale,
        displayOffsetTop: Math.min(virtualOffsetTop * displayScale, Math.max(0, displaySize - visibleSize)),
        displayBottomPadding: bottomPadding * displayScale
    };
}
//# sourceMappingURL=scrollMapping.js.map