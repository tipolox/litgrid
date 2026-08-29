export function getRowRange(startIndex: number, endIndex: number) {
  const firstIndex = Math.min(startIndex, endIndex)
  const lastIndex = Math.max(startIndex, endIndex)
  const rowIndexes = new Set<number>()

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    rowIndexes.add(index)
  }

  return rowIndexes
}
