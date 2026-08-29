export type VirtualizerOptions = {
  rowHeight: number
  viewportHeight: number
  overscan?: number
}

export type VirtualizerState = {
  rowHeight: number
  viewportHeight: number
  overscan: number
  scrollTop: number
}

export type VirtualRange = {
  startIndex: number
  endIndex: number
  offsetTop: number
  bottomPadding: number
  totalSize: number
  visibleSize: number
}

export type FixedVirtualRange = VirtualRange & {
  totalHeight: number
  visibleCount: number
}

export type FixedVirtualizer = {
  setOptions: (next: Partial<VirtualizerState>) => void
  setScrollTop: (scrollTop: number) => void
  setScrollOffset: (scrollTop: number) => void
  getState: (count: number) => FixedVirtualRange
}

export type VariableVirtualizerOptions = {
  sizes: number[]
  viewportSize: number
  overscan?: number
}

export type VariableVirtualizerState = {
  sizes: number[]
  viewportSize: number
  overscan: number
  scrollOffset: number
}

export type VariableVirtualRange = VirtualRange & {
  leftPadding: number
  rightPadding: number
}

export type VariableVirtualizer = {
  setOptions: (next: Partial<VariableVirtualizerState>) => void
  setScrollOffset: (scrollOffset: number) => void
  getState: () => VariableVirtualRange
}
