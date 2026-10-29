// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { DataGridComponent } from './DataGridComponent.js'
import { DataGrid as WebGrid } from '../../grid-web/src/components/DataGrid.js'

it('waits for the view, applies changed inputs once and retains state with revision-based data', () => {
  const component = new DataGridComponent()
  component.data = Array.from({ length: 150 }, (_, id) => ({ id, name: `Person ${id}` }))
  component.columns = [{ key: 'id' }, { key: 'name' }]
  component.config = { selection: { mode: 'row', rowKey: 'id' }, pagination: { enabled: true, pageSize: 25 } }
  component.dataRevision = 0
  component.ngOnChanges({})
  const grid = new WebGrid()
  Reflect.set(component, 'gridRef', { nativeElement: grid })
  component.ngAfterViewInit()
  grid.setPage(2); grid.selectRowByKey(51); grid.moveColumn('name', 0)
  const adopt = vi.spyOn(grid, 'updateData')
  component.theme = 'dark'
  component.config = { ...component.config }
  component.ngOnChanges({})
  expect(adopt).not.toHaveBeenCalled()
  expect(grid.getPagination().pageIndex).toBe(2)
  expect(grid.getSelectionSnapshot().rows[0].key).toBe(51)
  expect(grid.getColumnOrder()).toEqual(['name', 'id'])
  component.data.push({ id: 150, name: 'Added' })
  component.dataRevision = 1
  component.ngOnChanges({})
  expect(adopt).toHaveBeenCalledTimes(1)
  expect(grid.getTotalRowCount()).toBe(151)
  expect(grid.getPagination().pageIndex).toBe(2)
})
