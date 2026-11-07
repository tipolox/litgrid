import { expect, it, vi } from 'vitest'
import { createGridEngine } from './createGridEngine.js'

it.each(['replace', 'reorder', 'identity'] as const)('declines a cached keyed target after reported source %s', mutation => {
  const engine = createGridEngine({selection:{mode:'multi-row',rowKey:'id'},pagination:{enabled:true,pageSize:2}})
  const rows = Array.from({length:6}, (_,id) => ({id,name:'Person '+id}))
  engine.setData(rows)
  engine.setPage(1)
  engine.selectRowByKey(2)
  if (mutation === 'replace') rows[2] = {...rows[2], name:'Maria'}
  else if (mutation === 'reorder') [rows[2], rows[3]] = [rows[3], rows[2]]
  else rows[2].id = 99
  expect(engine.getDisplayedRowIndexForKey(2)).toBeUndefined()
  expect(engine.refreshData()).toBe(true)
  expect(engine.getDisplayedRowIndexForKey(2)).toBe(mutation === 'identity' ? undefined : mutation === 'reorder' ? 1 : 0)
  expect(engine.getSelectionSnapshot().rows[0]?.row).toBe(mutation === 'identity' ? undefined : rows[mutation === 'reorder' ? 3 : 2])
})

it('checks only the requested source slot on a safe 100k-row target', () => {
  const read = vi.fn((id: number) => id)
  const rows = Array.from({length:100000}, (_,id) => ({get id() { return read(id) }, status:'idle'}))
  const engine = createGridEngine({selection:{mode:'row',rowKey:'id'}})
  engine.setData(rows)
  read.mockClear()
  rows[54321].status = 'validating'
  expect(engine.getDisplayedRowIndexForKey(54321)).toBe(54321)
  expect(read).toHaveBeenCalledTimes(1)
  expect(read).toHaveBeenCalledWith(54321)
})

it('validates the source slot rather than the sorted paginated display offset', () => {
  const engine = createGridEngine({selection:{mode:'row',rowKey:'id'},pagination:{enabled:true,pageSize:2}})
  const rows = Array.from({length:6}, (_,id) => ({id,name:'Person '+id,status:'idle'}))
  engine.setData(rows)
  engine.sortBy('id','desc')
  engine.setPage(1)
  rows[3].status='validating'
  expect(engine.getDisplayedRowIndexForKey(3)).toBe(0)
  rows[3] = {...rows[3],name:'Replacement'}
  expect(engine.getDisplayedRowIndexForKey(3)).toBeUndefined()
  engine.refreshData()
  expect(engine.getVisibleRows(0,1)).toEqual([rows[3]])
  expect(engine.getPagination().pageIndex).toBe(1)
})

it('explicit full local refresh revalidates same-reference keys, page, and selection', () => {
  const engine=createGridEngine({selection:{mode:'multi-row',rowKey:'id'},pagination:{enabled:true,pageSize:2}})
  const rows=[{id:1,name:'Ada'},{id:2,name:'Grace'},{id:3,name:'Lin'}]
  engine.setData(rows)
  engine.setPage(1)
  expect(engine.getDisplayedRowIndexForKey(3)).toBe(0)
  engine.selectRowByKey(3)
  const changed=vi.fn()
  engine.onSelectionChange(changed)
  rows[2].id=99
  expect(engine.refreshData()).toBe(true)
  expect(engine.getPagination().pageIndex).toBe(1)
  expect(engine.getDisplayedRowIndexForKey(3)).toBeUndefined()
  expect(engine.getDisplayedRowIndexForKey(99)).toBe(0)
  expect(engine.getSelectionSnapshot().rows).toEqual([])
  expect(changed).toHaveBeenCalledTimes(1)
  rows.pop()
  expect(engine.refreshData()).toBe(true)
  expect(engine.getPagination().pageIndex).toBe(0)
  expect(engine.getRowCount()).toBe(2)
})

it('key-index lookup rejects off-page and globally duplicated identities', () => {
  const engine=createGridEngine({selection:{mode:'multi-row',rowKey:'id'},pagination:{enabled:true,pageSize:1}})
  engine.setData([{id:1},{id:1},{id:2}])
  expect(engine.getDisplayedRowIndexForKey(1)).toBeUndefined()
  expect(engine.getDisplayedRowIndexForKey(2)).toBeUndefined()
  engine.setPage(2)
  expect(engine.getDisplayedRowIndexForKey(2)).toBe(0)
  engine.setConfig({queryMode:'external',selection:{mode:'multi-row',rowKey:'id'}})
  expect(engine.refreshData()).toBe(false)
})
