export type ScrollMappingOptions = {
    displayScrollOffset: number;
    previousDisplayScrollOffset: number;
    displaySize: number;
    totalSize: number;
    viewportSize: number;
};
export type ScrollMappingResult = {
    availableDisplaySize: number;
    availableVirtualSize: number;
    scrollOffset: number;
};
export declare function mapDisplayScrollOffset({ displayScrollOffset, previousDisplayScrollOffset, displaySize, totalSize, viewportSize }: ScrollMappingOptions): ScrollMappingResult;
export type DisplayLayoutOptions = {
    totalSize: number;
    displaySize: number;
    virtualOffsetTop: number;
    visibleSize: number;
    bottomPadding: number;
};
export type DisplayLayout = {
    displayScale: number;
    displayOffsetTop: number;
    displayBottomPadding: number;
};
export declare function calculateDisplayLayout({ totalSize, displaySize, virtualOffsetTop, visibleSize, bottomPadding }: DisplayLayoutOptions): DisplayLayout;
//# sourceMappingURL=scrollMapping.d.ts.map