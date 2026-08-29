export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function sumSizes(sizes: number[], startIndex: number, endIndex: number) {
  let total = 0

  for (let index = startIndex; index < endIndex; index += 1) {
    total += Math.max(1, sizes[index] ?? 0)
  }

  return total
}
