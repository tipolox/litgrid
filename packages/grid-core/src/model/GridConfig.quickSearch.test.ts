import { expect, it } from 'vitest'
import { normalizeConfig } from './GridConfig.js'

it('retains defaults for omitted quick-search settings', () => {
  for (const queryMode of ['local', 'external'] as const) {
    expect(normalizeConfig({ queryMode }).quickSearch).toEqual({
      visible: true, label: 'Quick search', placeholder: 'Search all columns', description: ''
    })
  }
})

it('normalizes quick-search presentation without altering paging or external mode', () => {
  const result = normalizeConfig({ queryMode: 'external',
    quickSearch: { visible: false, label: 'Code prefix', placeholder: 'Code or name starts with…', description: 'Only codes and names' },
    pagination: { enabled: true, pageIndex: 2, pageSize: 25 }
  })
  expect(result.quickSearch).toEqual({ visible: false, label: 'Code prefix', placeholder: 'Code or name starts with…', description: 'Only codes and names' })
  expect(result.queryMode).toBe('external')
  expect(result.pagination).toEqual({ enabled: true, pageIndex: 2, pageSize: 25 })
  expect(normalizeConfig({ quickSearch: { label: ' ', placeholder: '' } }).quickSearch).toMatchObject({ label: 'Quick search', placeholder: '' })
})
