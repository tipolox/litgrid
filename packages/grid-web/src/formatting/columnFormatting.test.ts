import { describe, expect, it, vi, afterEach } from 'vitest'
import { dateValue, prepareColumns } from './columnFormatting.js'
import type { GridColumn } from '../types.js'

afterEach(() => vi.restoreAllMocks())
const number = { kind: 'number', locale: 'en-GB' } as const
const dateTime = { kind: 'dateTime', locale: 'en-GB', options: { timeZone: 'UTC', dateStyle: 'medium' } } as const
function display(format: GridColumn['format'], value: unknown) {
  return prepareColumns([{ key: 'value', format }], new Map()).formats.get('value')!.display(value)
}

describe('bounded column formatting', () => {
  it('formats decimal, currency, percent, negative zero and blanks without coercing data', () => {
    expect(display(number, 1234.5)).toBe('1,234.5')
    expect(display({ ...number, options: { style: 'currency', currency: 'SGD', currencyDisplay: 'code', currencySign: 'accounting', useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 } }, -1234.5)).toContain('1,234.50'.replace(',', ''))
    expect(display({ ...number, options: { style: 'percent', maximumFractionDigits: 1 } }, .125)).toBe('12.5%')
    expect(display(number, 0)).toBe('0')
    expect(display(number, -0)).toBe('-0')
    // Native grouping enum strings are part of the allowlisted option; their
    // TypeScript availability follows the consumer's Intl lib, as in the RFC.
    expect(display({...number,options:{useGrouping:'always'}} as unknown as GridColumn['format'],1234)).toBe('1,234')
    for (const value of [null, undefined, '', '12', true, {}, [], 1n, NaN, Infinity, -Infinity]) expect(display(number, value)).toBe('')
  })
  it.each([
    { align: 'justify' }, { format: null }, { format: {} },
    { format: { ...number, kind: 'unit' } }, { format: { ...number, extra: true } },
    { format: { ...number, locale: '' } }, { format: { ...number, locale: 'invalid_locale' } },
    { format: { ...number, options: { style: 'unit', unit: 'meter' } } },
    { format: { ...number, options: { style: 'currency' } } },
    { format: { ...number, options: { style: 'currency', currency: 'SGDD' } } },
    { format: { ...number, options: { currencyDisplay: 'bogus' } } },
    { format: { ...number, options: { currencySign: 'bogus' } } },
    { format: { ...number, options: { useGrouping: 'true' } } },
    { format: { ...number, options: { maximumFractionDigits: '2' } } },
    { format: { ...number, options: { maximumFractionDigits: NaN } } },
    { format: { ...number, options: { minimumFractionDigits: 4, maximumFractionDigits: 1 } } },
    { format: { ...number, options: { roundingMode: 'ceil' } } },
    { format: { ...dateTime, options: {} } }, { format: { ...dateTime, options: { timeZone: '' } } },
    { format: { ...dateTime, options: { timeZone: 'Mars/Olympus' } } },
    { format: { ...dateTime, options: { timeZone: 'UTC', year: 'numeric' } } },
    { format: { ...dateTime, options: { timeZone: 'UTC', dateStyle: 'bogus' } } },
    { format: { ...dateTime, options: { timeZone: 'UTC', timeStyle: false } } },
  ])('rejects invalid schema before changing the previous cache: %j', metadata => {
    const old = prepareColumns([{ key: 'value', format: number }], new Map())
    const entry = old.formats.get('value')
    expect(() => prepareColumns([{ key: 'value', ...metadata } as GridColumn], old.formats)).toThrow('Column "value"')
    expect(old.formats.get('value')).toBe(entry)
    expect(entry!.display(2)).toBe('2')
  })
  it('rejects getters/symbols/prototype objects without evaluating data accessors', () => {
    const getter = vi.fn(() => 'number')
    for (const format of [Object.defineProperty({}, 'kind', {get: getter, enumerable:true}), new Date(), {...number, [Symbol('x')]:true}, {...number, options: {maximumFractionDigits:undefined}}]) {
      expect(() => prepareColumns([{key:'x',format:format as never}],new Map())).toThrow()
    }
    expect(getter).not.toHaveBeenCalled()
  })
  it('reuses unchanged instances, detaches mutable options, and leaves no removed entries', () => {
    const Native = Intl.NumberFormat
    const construct = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (locale, options) { return new Native(locale, options) })
    const options = {maximumFractionDigits:2}
    const first = prepareColumns([{ key:'n',format:{...number,options}}],new Map())
    expect(construct).toHaveBeenCalledTimes(1)
    const second = prepareColumns([{ key:'n',format:{...number,options:{...options}}}],first.formats)
    expect(second.formats.get('n')).toBe(first.formats.get('n'))
    options.maximumFractionDigits=0
    expect(first.formats.get('n')!.display(1.25)).toBe('1.25')
    const third = prepareColumns([{key:'n',format:{...number,options}}],second.formats)
    expect(third.formats.get('n')!.display(1.25)).toBe('1')
    expect(construct).toHaveBeenCalledTimes(2)
    expect(prepareColumns([], third.formats).formats.size).toBe(0)
    prepareColumns([{key:'plain'}], new Map())
    expect(construct).toHaveBeenCalledTimes(2)
  })
  it('parses exact ISO instants with offsets and .NET fractions, validating the calendar', () => {
    expect(dateValue('2026-11-10T08:15:00.1234567+08:00')).toBe(Date.parse('2026-11-10T00:15:00.123Z'))
    expect(dateValue('2024-02-29T00:00:00Z')).toBe(Date.parse('2024-02-29T00:00:00Z'))
    expect(dateValue('0000-02-29T00:00:00Z')).toBe(Date.parse('0000-02-29T00:00:00Z'))
    for (const value of ['2023-02-29T00:00:00Z', '1900-02-29T00:00:00Z', '2026-04-31T00:00:00Z', '2026-00-01T00:00:00Z', '2026-01-00T00:00:00Z', '2026-11-10', '2026-11-10T08:15:00', '2026-11-10T24:00:00Z', '2026-11-10T00:00:60Z', '2026-11-10T00:00:00+24:00', '2026-11-10T00:00:00+01:60', '2026-11-10T00:00:00.12345678Z', new Date(NaN), 8.64e15+1, Infinity, null, true, {}]) expect(dateValue(value)).toBeUndefined()
    expect(dateValue(0)).toBe(0)
    expect(dateValue(-8.64e15)).toBe(-8.64e15)
    const date = new Date(0)
    date.getTime = () => { throw new Error('User override must not execute') }
    expect(dateValue(date)).toBe(0)
    expect(dateValue(new Proxy(new Date(), {}))).toBeUndefined()
  })
  it('formats equal instants equally and handles DST through explicit timezone', () => {
    const format = { ...dateTime, options: { timeZone:'America/New_York', timeStyle:'short' as const } }
    expect(display(format,'2026-03-08T06:59:00Z')).toBe('01:59')
    expect(display(format,'2026-03-08T07:00:00Z')).toBe('03:00')
    expect(display(format,'2026-03-08T03:00:00-04:00')).toBe('03:00')
    expect(display(format,new Date('2026-03-08T07:00:00Z'))).toBe('03:00')
    expect(display(dateTime, 'not a date')).toBe('')
  })
})
