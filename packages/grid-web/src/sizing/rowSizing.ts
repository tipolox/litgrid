import { MIN_ROW_HEIGHT } from './constants'

export function normalizeRowHeight(height: number) {
  return Math.max(MIN_ROW_HEIGHT, height)
}
