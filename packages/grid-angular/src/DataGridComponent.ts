import '@tipolox/litgrid-web'
import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core'
import type {
  BestFitColumnWidth,
  ColumnReorderDetail,
  ColumnStateChangeDetail,
  ColumnVisibilityChangeDetail,
  DataGridElement,
  GridColumn,
  GridColumnState,
  GridConfig,
  GridFilter,
  GridPaginationState,
  GridSelection,
  GridTheme,
  SelectionIntent
} from '@tipolox/litgrid-web'
import { syncGridInputs } from './gridBindings'

@Component({
  selector: 'litgrid-data-grid',
  standalone: true,
  template: `
    <yc-grid
      #grid
      (column-state-change)="handleColumnStateChange($event)"
      (column-reorder)="handleColumnReorder($event)"
      (column-visibility-change)="handleColumnVisibilityChange($event)"
    ></yc-grid>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DataGridComponent implements AfterViewInit, OnChanges {
  @Input() data: unknown[] = []
  @Input() columns: GridColumn[] = []
  @Input() config: GridConfig = {}
  @Input() theme: GridTheme = 'light'
  @Input() ariaLabel = 'Data grid'
  @Input() ariaDescription = ''
  @Input() screenReaderAnnouncements = true
  @Input() height = 320
  @Input() rowHeight = 36
  @Input() overscan = 4
  @Input() columnOverscan = 2
  @Input() bestFitSampleSize = 10
  @Input() quickSearchDebounceThreshold = 10_000
  @Input() quickSearchDebounceMs = 150
  @Input() columnStateStorageKey?: string

  @Output() readonly columnStateChange = new EventEmitter<ColumnStateChangeDetail>()
  @Output() readonly columnReorder = new EventEmitter<ColumnReorderDetail>()
  @Output() readonly columnVisibilityChange = new EventEmitter<ColumnVisibilityChangeDetail>()

  @ViewChild('grid', { static: true }) private gridRef?: ElementRef<DataGridElement>

  get gridElement(): DataGridElement | null {
    return this.gridRef?.nativeElement ?? null
  }

  ngAfterViewInit(): void {
    this.syncInputs()
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.syncInputs()
  }

  handleColumnStateChange(event: Event): void {
    this.columnStateChange.emit((event as CustomEvent<ColumnStateChangeDetail>).detail)
  }

  handleColumnReorder(event: Event): void {
    this.columnReorder.emit((event as CustomEvent<ColumnReorderDetail>).detail)
  }

  handleColumnVisibilityChange(event: Event): void {
    this.columnVisibilityChange.emit(
      (event as CustomEvent<ColumnVisibilityChangeDetail>).detail
    )
  }

  getRowHeight(rowIndex: number): number {
    return this.requireGridElement().getRowHeight(rowIndex)
  }

  getColumnWidth(column: GridColumn): number {
    return this.requireGridElement().getColumnWidth(column)
  }

  setRowHeight(rowIndex: number, height: number): void {
    this.requireGridElement().setRowHeight(rowIndex, height)
  }

  resetRowHeight(rowIndex: number): void {
    this.requireGridElement().resetRowHeight(rowIndex)
  }

  resetAllRowHeights(): void {
    this.requireGridElement().resetAllRowHeights()
  }

  setColumnWidth(columnKey: string, width: number): void {
    this.requireGridElement().setColumnWidth(columnKey, width)
  }

  resetColumnWidth(columnKey: string): void {
    this.requireGridElement().resetColumnWidth(columnKey)
  }

  resetAllColumnWidths(): void {
    this.requireGridElement().resetAllColumnWidths()
  }

  moveColumn(columnKey: string, targetIndex: number): void {
    this.requireGridElement().moveColumn(columnKey, targetIndex)
  }

  getColumnOrder(): string[] {
    return this.requireGridElement().getColumnOrder()
  }

  setColumnOrder(columnKeys: string[]): void {
    this.requireGridElement().setColumnOrder(columnKeys)
  }

  resetColumnOrder(): void {
    this.requireGridElement().resetColumnOrder()
  }

  setColumnVisible(columnKey: string, visible: boolean): void {
    this.requireGridElement().setColumnVisible(columnKey, visible)
  }

  isColumnVisible(columnKey: string): boolean {
    return this.requireGridElement().isColumnVisible(columnKey)
  }

  getVisibleColumnKeys(): string[] {
    return this.requireGridElement().getVisibleColumnKeys()
  }

  resetColumnVisibility(): void {
    this.requireGridElement().resetColumnVisibility()
  }

  getColumnState(): GridColumnState {
    return this.requireGridElement().getColumnState()
  }

  setColumnState(state: GridColumnState): void {
    this.requireGridElement().setColumnState(state)
  }

  resetColumnState(): void {
    this.requireGridElement().resetColumnState()
  }

  bestFitColumn(columnKey: string): number | null {
    return this.requireGridElement().bestFitColumn(columnKey)
  }

  bestFitAllColumns(): BestFitColumnWidth[] {
    return this.requireGridElement().bestFitAllColumns()
  }

  copySelectedCells(): Promise<boolean> {
    return this.requireGridElement().copySelectedCells()
  }

  copySelectedRows(): Promise<boolean> {
    return this.requireGridElement().copySelectedRows()
  }

  setQuickSearch(query: string): void {
    this.requireGridElement().setQuickSearch(query)
  }

  clearQuickSearch(): void {
    this.requireGridElement().clearQuickSearch()
  }

  getQuickSearch(): string {
    return this.requireGridElement().getQuickSearch()
  }

  setFilter(filter: GridFilter): void {
    this.requireGridElement().setFilter(filter)
  }

  clearFilter(columnKey?: string): void {
    this.requireGridElement().clearFilter(columnKey)
  }

  getFilters(): GridFilter[] {
    return this.requireGridElement().getFilters()
  }

  setPage(pageIndex: number): void {
    this.requireGridElement().setPage(pageIndex)
  }

  setPageSize(pageSize: number): void {
    this.requireGridElement().setPageSize(pageSize)
  }

  getPagination(): GridPaginationState {
    return this.requireGridElement().getPagination()
  }

  getTotalRowCount(): number {
    return this.requireGridElement().getTotalRowCount()
  }

  selectRow(rowIndex: number, intent?: SelectionIntent): void {
    this.requireGridElement().selectRow(rowIndex, intent)
  }

  selectAllRows(): void {
    this.requireGridElement().selectAllRows()
  }

  clearSelection(): void {
    this.requireGridElement().clearSelection()
  }

  getSelection(): GridSelection {
    return this.requireGridElement().getSelection()
  }

  isRowSelected(rowIndex: number): boolean {
    return this.requireGridElement().isRowSelected(rowIndex)
  }

  isCellSelected(rowIndex: number, columnKey: string): boolean {
    return this.requireGridElement().isCellSelected(rowIndex, columnKey)
  }

  private syncInputs(): void {
    const grid = this.gridElement
    if (!grid) return

    syncGridInputs(grid, this)
  }

  private requireGridElement(): DataGridElement {
    const grid = this.gridElement
    if (!grid) {
      throw new Error('LitGrid is not available before the Angular view is initialized.')
    }
    return grid
  }
}
