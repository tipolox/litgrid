import type { GridColumn, GridValueFormat } from '../types.js'

const numberOptions = ['style', 'currency', 'currencyDisplay', 'currencySign', 'useGrouping', 'minimumFractionDigits', 'maximumFractionDigits']
const dateOptions = ['dateStyle', 'timeStyle', 'timeZone']
const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
type DataObject = Record<string, unknown>

function object(value: unknown): DataObject {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError('Expected a plain data object.')
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!
    if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError('Only enumerable string-keyed data properties are supported.')
    }
  }
  return value as DataObject
}

/** Validate and detach only bounded presentation metadata. Does not construct Intl. */
export function snapshotColumn(column: GridColumn): GridColumn {
  const align = Object.getOwnPropertyDescriptor(column, 'align')
  const format = Object.getOwnPropertyDescriptor(column, 'format')
  if ((align && !('value' in align)) || (format && !('value' in format))) throw new TypeError('Presentation metadata cannot use getters.')
  if (column.align !== undefined && !['start', 'center', 'end', 'left', 'right'].includes(column.align)) throw new TypeError('Invalid alignment.')
  if (column.format === undefined) return { ...column }
  const source = object(column.format)
  if (Object.keys(source).some(key => !['kind', 'locale', 'options'].includes(key))) throw new TypeError('Unsupported format field.')
  if (source.kind !== 'number' && source.kind !== 'dateTime') throw new TypeError('Invalid format kind.')
  if (typeof source.locale !== 'string' || !source.locale.trim()) throw new TypeError('An explicit locale is required.')
  const options = source.options === undefined && source.kind === 'number' ? {} : object(source.options)
  const allowed = source.kind === 'number' ? numberOptions : dateOptions
  for (const key of Object.keys(options)) {
    const value = options[key]
    if (!allowed.includes(key)) throw new TypeError('Unsupported option: ' + key)
    if (key === 'minimumFractionDigits' || key === 'maximumFractionDigits') {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Expected a finite number: ' + key)
    } else if (key === 'useGrouping') {
      if (typeof value !== 'boolean' && !['auto', 'always', 'min2'].includes(value as string)) throw new TypeError('Invalid grouping option.')
    } else if (typeof value !== 'string') throw new TypeError('Expected a string: ' + key)
  }
  if (source.kind === 'number' && options.style !== undefined && !['decimal', 'currency', 'percent'].includes(options.style as string)) throw new TypeError('Invalid number style.')
  if (source.kind === 'dateTime' && (typeof options.timeZone !== 'string' || !options.timeZone.trim())) throw new TypeError('An explicit timezone is required.')
  return { ...column, format: { ...source, options: { ...options } } as GridValueFormat }
}

function sameFormat(left: GridValueFormat | undefined, right: GridValueFormat | undefined) {
  if (!left || !right) return left === right
  return left.kind === right.kind && left.locale === right.locale &&
    Object.keys(left.options ?? {}).length === Object.keys(right.options ?? {}).length &&
    Object.entries(left.options ?? {}).every(([key, value]) => Object.is(value, Reflect.get(right.options ?? {}, key)))
}

export type CompiledColumnFormat = { descriptor: GridValueFormat; display: (value: unknown) => string }

// Keep returned display closures outside schema adoption's lexical scope. A
// closure created in its map callback can retain previous schema/cache maps.
function detachedDisplay(format: GridValueFormat, formatter: Intl.NumberFormat | Intl.DateTimeFormat) {
  return format.kind === 'number'
    ? (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? (formatter as Intl.NumberFormat).format(value) : ''
    : (value: unknown) => {
      const instant = dateValue(value)
      return instant === undefined ? '' : (formatter as Intl.DateTimeFormat).format(instant)
    }
}

/** All work is staged; failures leave the caller's active schema/cache untouched. */
export function prepareColumns(columns: GridColumn[], previous: ReadonlyMap<string, CompiledColumnFormat>) {
  const formats = new Map<string, CompiledColumnFormat>()
  const alignments = new Map<string, string>()
  const keys = new Set<string>()
  const snapshots = columns.map(column => {
    try {
      if (keys.has(column.key)) throw new TypeError('Duplicate column schema key.')
      keys.add(column.key)
      const snapshot = snapshotColumn(column)
      if (snapshot.format) {
        const old = previous.get(column.key)
        if (old && sameFormat(old.descriptor, snapshot.format)) formats.set(column.key, old)
        else {
          const format = snapshot.format
          // Locale syntax and every native enum/range/combination are validated here.
          // Intl can negotiate a well-formed unsupported locale, as specified.
          const formatter = format.kind === 'number'
            ? new Intl.NumberFormat(format.locale, format.options)
            : new Intl.DateTimeFormat(format.locale, format.options)
          const display = detachedDisplay(format, formatter)
          formats.set(column.key, { descriptor: format, display })
        }
      }
      // Compile plain formatting into the existing renderer pipeline. Source
      // descriptors are detached; caller renderers always retain precedence.
      if (snapshot.format && !snapshot.render) snapshot.render = formats.get(column.key)!.display
      if (snapshot.align) alignments.set(column.key, 'cell-align-' + snapshot.align)
      return snapshot
    } catch (error) {
      const failure = new TypeError(`Column ${JSON.stringify(column.key)}: ${error instanceof Error ? error.message : String(error)}`)
      failure.name = 'GridColumnPresentationError'
      throw failure
    }
  })
  return { columns: snapshots, formats, alignments }
}

/** Strict offset ISO timestamps, with .NET fractional precision truncated to ms. */
export function dateValue(value: unknown): number | undefined {
  if (value && typeof value === 'object') {
    // The intrinsic also accepts cross-realm Dates and avoids overridden methods.
    try { value = Date.prototype.getTime.call(value) } catch { return undefined }
  }
  if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) <= 8.64e15 ? value : undefined
  if (typeof value !== 'string') return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value)
  if (!match) return undefined
  const [, y, mo, d, h, mi, s, fraction = '', offset, , oh = '0', om = '0'] = match
  const year = Number(y), month = Number(mo), day = Number(d)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  if (month < 1 || month > 12 || day < 1 || day > (month === 2 && leap ? 29 : monthDays[month - 1]) || Number(h) > 23 || Number(mi) > 59 || Number(s) > 59 || Number(oh) > 23 || Number(om) > 59) return undefined
  const instant = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}.${fraction.padEnd(3, '0').slice(0, 3)}${offset}`)
  return Number.isFinite(instant) ? instant : undefined
}
