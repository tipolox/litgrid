import { Component } from '@angular/core'
import { DataGridComponent, type GridColumn } from '@tipolox/litgrid-angular'

interface Person { id: number; name: string }

@Component({
  standalone: true,
  imports: [DataGridComponent],
  template: '<litgrid-data-grid [data]="people" [columns]="columns" />',
})
export class TypedColumnsConsumer {
  people: Person[] = [{ id: 1, name: 'Ada' }]
  columns = [
    { key: 'name', align: 'end', render: (_value, row) => row.name.toUpperCase() },
    { key: 'label', accessor: row => `${row.id}: ${row.name}` },
  ] satisfies GridColumn<Person>[]
}
