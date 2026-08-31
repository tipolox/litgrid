import { MIN_ROW_HEIGHT } from './constants.js'

export function normalizeRowHeight(height: number) {
  return Math.max(MIN_ROW_HEIGHT, height)
}
