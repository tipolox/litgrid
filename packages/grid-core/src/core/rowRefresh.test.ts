import { expect, it, vi } from 'vitest'
import { createGridEngine } from './createGridEngine.js'

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
