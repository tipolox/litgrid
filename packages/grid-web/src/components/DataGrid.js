// src/components/DataGrid.ts
import { LitElement, css, html, render as litRender } from 'lit';
import { cache } from 'lit/directives/cache.js';
import { createGridEngine } from '@tipolox/litgrid-core';
import { calculateDisplayLayout, createVariableVirtualizer, createVirtualizer, mapDisplayScrollOffset } from '@tipolox/litgrid-renderer';
import { darkThemeStyles } from '../theme/darkTheme';
import { lightThemeStyles } from '../theme/lightTheme';
import { MIN_COLUMN_WIDTH, MIN_ROW_HEIGHT } from '../sizing/constants';
import { normalizeColumnWidth, resolveColumnWidth } from '../sizing/columnSizing';
import { normalizeRowHeight } from '../sizing/rowSizing';
import { serializeSelectedCells } from '../clipboard/serializeSelectedCells';
import { serializeSelectedRows } from '../clipboard/serializeSelectedRows';
import { createColumnState, parseColumnState, resolveColumnState } from '../columnState/columnState';
const FILTER_OPERATORS = [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
    { value: 'isEmpty', label: 'Is empty' },
    { value: 'isNotEmpty', label: 'Is not empty' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'greaterThanOrEqual', label: 'Greater than or equal' },
    { value: 'lessThan', label: 'Less than' },
    { value: 'lessThanOrEqual', label: 'Less than or equal' }
];
export class DataGrid extends LitElement {
    static { this.nextInstanceId = 0; }
    static { this.properties = {
        theme: { type: String, reflect: true },
        ariaLabel: { type: String, attribute: 'aria-label', reflect: true },
        ariaDescription: { type: String, attribute: 'aria-description', reflect: true },
        screenReaderAnnouncements: { type: Boolean, attribute: 'screen-reader-announcements', reflect: true }
    }; }
    constructor() {
        super();
        this.gridId = `litgrid-${DataGrid.nextInstanceId++}`;
        this.engine = createGridEngine();
        this.fixedRowVirtualizer = createVirtualizer({
            rowHeight: 36,
            viewportHeight: 320,
            overscan: 4
        });
        this.variableRowVirtualizer = createVariableVirtualizer({
            sizes: [],
            viewportSize: 320,
            overscan: 4
        });
        this.columnVirtualizer = createVariableVirtualizer({
            sizes: [],
            viewportSize: 0,
            overscan: 2
        });
        this.rowHeight = 36;
        this.height = 320;
        this.overscan = 4;
        this.columnOverscan = 2;
        this._bestFitSampleSize = 10;
        this.horizontalScrollLeft = 0;
        this.viewportWidth = 0;
        this.scrollbarWidth = 0;
        this.columnDefs = [];
        this.sourceColumnDefs = [];
        this.columnWidths = new Map();
        this.hiddenColumnKeys = new Set();
        this._columnStateStorageKey = null;
        this.rowHeights = new Map();
        this.bestFitWidths = new Map();
        this.columnResizeState = null;
        this.rowResizeState = null;
        this.columnReorderState = null;
        this.columnDragPreview = null;
        this.previousBodyCursor = '';
        this.previousBodyUserSelect = '';
        this.activeHeaderMenu = null;
        this.columnChooserOpen = false;
        this.columnChooserPosition = null;
        this.quickSearchVisible = false;
        this.quickSearchDraft = '';
        this.quickSearchDebounceId = null;
        this.sourceRowCount = 0;
        this.filterDrafts = new Map();
        this.measureContainer = null;
        this.viewportElement = null;
        this.scrollRAFId = null;
        this.pendingScrollTop = 0;
        this.pendingScrollLeft = 0;
        this.previousPendingScrollTop = 0;
        this.headerRowElement = null;
        this.activeCell = null;
        this.shouldFocusActiveCell = false;
        this.headerMenuTrigger = null;
        this.shouldFocusHeaderMenu = false;
        this.shouldRestoreHeaderMenuFocus = false;
        this.screenReaderMessage = '';
        this.lastScreenReaderAnnouncement = '';
        // Use a larger cap (2^26) to avoid hitting browser element-height limits.
        this.maxScrollableHeight = 67108864;
        this.lastTotalSize = 0;
        this.lastDisplayTotal = 0;
        this.quickSearchDebounceThreshold = 10000;
        this.quickSearchDebounceMs = 150;
        this.textMeasureContext = null;
        this.handleColumnReorder = (event) => {
            const state = this.columnReorderState;
            if (!state)
                return;
            if (!state.hasMoved && Math.abs(event.clientX - state.startX) < 5)
                return;
            if (!state.hasMoved) {
                state.hasMoved = true;
                this.startBodyResize('grabbing');
            }
            this.updateColumnDragPreview(state.columnKey, event.clientX, event.clientY);
            const viewport = this.viewportElement ?? this.renderRoot.querySelector('.viewport');
            if (viewport) {
                const bounds = viewport.getBoundingClientRect();
                const edgeSize = 32;
                if (event.clientX < bounds.left + edgeSize) {
                    viewport.scrollLeft = Math.max(0, viewport.scrollLeft - 16);
                }
                else if (event.clientX > bounds.right - edgeSize) {
                    viewport.scrollLeft += 16;
                }
            }
            const headers = Array.from(this.renderRoot.querySelectorAll('.header-cell[data-column-key]'));
            const target = headers.find((header) => {
                const bounds = header.getBoundingClientRect();
                return event.clientX >= bounds.left && event.clientX <= bounds.right;
            });
            if (!target) {
                this.requestUpdate();
                return;
            }
            const targetKey = target.dataset.columnKey;
            const targetIndex = this.getResolvedColumns().findIndex((column) => column.key === targetKey);
            if (targetIndex < 0)
                return;
            const bounds = target.getBoundingClientRect();
            let nextIndex = targetIndex + (event.clientX > bounds.left + bounds.width / 2 ? 1 : 0);
            if (state.sourceIndex < nextIndex)
                nextIndex -= 1;
            state.targetIndex = Math.max(0, Math.min(nextIndex, this.getResolvedColumns().length - 1));
            this.requestUpdate();
        };
        this.stopColumnReorder = () => {
            const state = this.columnReorderState;
            if (!state)
                return;
            this.columnReorderState = null;
            window.removeEventListener('pointermove', this.handleColumnReorder);
            window.removeEventListener('pointerup', this.stopColumnReorder);
            window.removeEventListener('pointercancel', this.stopColumnReorder);
            this.removeColumnDragPreview();
            if (state.hasMoved)
                this.stopBodyResize();
            if (state.hasMoved && state.sourceIndex !== state.targetIndex) {
                this.moveColumn(state.columnKey, state.targetIndex);
            }
            else {
                this.requestUpdate();
            }
        };
        this.handleColumnResize = (event) => {
            if (!this.columnResizeState) {
                return;
            }
            const nextWidth = Math.max(MIN_COLUMN_WIDTH, this.columnResizeState.startWidth + event.clientX - this.columnResizeState.startX);
            this.columnWidths.set(this.columnResizeState.columnKey, nextWidth);
            this.requestUpdate();
        };
        this.stopColumnResize = () => {
            if (!this.columnResizeState) {
                return;
            }
            this.columnResizeState = null;
            this.commitColumnState('resize');
            this.stopBodyResize();
            window.removeEventListener('pointermove', this.handleColumnResize);
            window.removeEventListener('pointerup', this.stopColumnResize);
        };
        this.handleRowResize = (event) => {
            if (!this.rowResizeState) {
                return;
            }
            const nextHeight = Math.max(MIN_ROW_HEIGHT, this.rowResizeState.startHeight + event.clientY - this.rowResizeState.startY);
            this.setRowHeight(this.rowResizeState.rowIndex, nextHeight);
        };
        this.stopRowResize = () => {
            if (!this.rowResizeState) {
                return;
            }
            this.rowResizeState = null;
            this.stopBodyResize();
            window.removeEventListener('pointermove', this.handleRowResize);
            window.removeEventListener('pointerup', this.stopRowResize);
        };
        this.handleScroll = (event) => {
            const target = event.currentTarget;
            const scrollLeft = target?.scrollLeft ?? 0;
            const scrollTop = target?.scrollTop ?? 0;
            this.pendingScrollTop = scrollTop;
            this.pendingScrollLeft = scrollLeft;
            this.horizontalScrollLeft = scrollLeft;
            this.headerRowElement = this.headerRowElement ?? this.renderRoot.querySelector('.header-column-row');
            if (this.headerRowElement) {
                this.headerRowElement.style.transform = `translateX(${-scrollLeft}px)`;
            }
            if (this.scrollRAFId !== null) {
                return;
            }
            this.scrollRAFId = requestAnimationFrame(() => {
                this.scrollRAFId = null;
                const rowVirtualizer = this.hasCustomRowHeights()
                    ? this.variableRowVirtualizer
                    : this.fixedRowVirtualizer;
                // Map the visible scrollTop (capped display space) to the virtualizer's
                // real scroll offset when we've capped the spacer height for very large grids.
                // Use the measured `lastDisplayTotal` when available, otherwise fall
                // back to the intended display size (min(totalSize, maxScrollableHeight)).
                const measuredDisplay = this.lastDisplayTotal > 0 ? this.lastDisplayTotal : Math.min(this.lastTotalSize || 0, this.maxScrollableHeight);
                const viewportH = Math.max(0, this.height || 0);
                const scrollMapping = mapDisplayScrollOffset({
                    displayScrollOffset: this.pendingScrollTop,
                    previousDisplayScrollOffset: this.previousPendingScrollTop,
                    displaySize: measuredDisplay,
                    totalSize: this.lastTotalSize,
                    viewportSize: viewportH
                });
                // Debug: large-grid scroll mapping (kept behind a high threshold)
                if (this.lastTotalSize > 6000000) {
                    // eslint-disable-next-line no-console
                    console.log('[yc-grid] scroll map', {
                        pendingScrollTop: this.pendingScrollTop,
                        lastTotalSize: this.lastTotalSize,
                        lastDisplayTotal: this.lastDisplayTotal,
                        measuredDisplay,
                        viewportH,
                        availableDisplay: scrollMapping.availableDisplaySize,
                        availableVirtual: scrollMapping.availableVirtualSize,
                        mappedScrollOffset: scrollMapping.scrollOffset
                    });
                }
                rowVirtualizer.setScrollOffset(scrollMapping.scrollOffset);
                this.columnVirtualizer.setScrollOffset(this.pendingScrollLeft);
                // track last applied pending scroll so we can detect scroll direction
                this.previousPendingScrollTop = this.pendingScrollTop;
                this.requestUpdate();
            });
        };
        this.theme = 'light';
        this.ariaLabel = 'Data grid';
        this.ariaDescription = '';
        this.screenReaderAnnouncements = true;
    }
    static { this.styles = [lightThemeStyles, darkThemeStyles, css `
    :host {
      display: block;
      color: var(--litgrid-color-text);
      font: 14px/1.4 system-ui, sans-serif;
    }

    .shell {
      position: relative;
      border: 1px solid var(--litgrid-color-border-strong);
      border-radius: 12px;
      background: var(--litgrid-color-surface);
      box-shadow: var(--litgrid-shadow-shell);
      overflow: hidden;
    }

    .viewport {
      overflow: auto;
      height: var(--grid-height, 320px);
    }

    .screen-reader-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .header-column-row,
    .row {
      display: grid;
      grid-template-columns: var(--virtual-grid-template);
    }

    .header-shell {
      position: relative;
      z-index: 3;
      display: grid;
      grid-template-columns: var(--header-grid-template);
      border-bottom: 1px solid var(--litgrid-color-border);
      background: var(--litgrid-color-surface-subtle);
    }

    .header-clip {
      overflow: visible;
      z-index: 3;
    }

    .header-column-row {
      position: relative;
      z-index: 2;
      width: var(--total-column-width);
      color: var(--litgrid-color-text-header);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .header-cell,
    .row-header-cell,
    .cell {
      box-sizing: border-box;
      min-width: 0;
      padding: 0 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

        .header-cell {
      position: relative;
      z-index: 2;
      overflow: visible;
      height: 36px;
      display: flex;
      align-items: center;
      border-right: 1px solid var(--litgrid-color-border-subtle);
      cursor: grab;
      touch-action: none;
    }

    .header-cell-reordering {
      opacity: 0.55;
      cursor: grabbing;
    }

    .header-cell-drop-before::before,
    .header-cell-drop-after::after {
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 4;
      width: 2px;
      background: var(--litgrid-color-accent);
      content: '';
      pointer-events: none;
    }

    .header-cell-drop-before::before {
      left: -1px;
    }

    .header-cell-drop-after::after {
      right: -1px;
    }

    .row-header-cell {
      position: sticky;
      left: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--row-header-width, 0px);
      border-right: 1px solid var(--litgrid-color-border);
      background: var(--litgrid-color-surface-subtle);
      color: var(--litgrid-color-text-subtle);
      font-size: 12px;
      font-weight: 600;
      user-select: none;
    }

    .header-row-header {
      position: relative;
      height: 36px;
      border-right: 1px solid var(--litgrid-color-border);
    }

    .header-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-actions {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      position: relative;
      z-index: 2;
    }

    .header-action-button {
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--litgrid-color-text-muted);
      font-size: 16px;
      line-height: 1;
      padding: 4px;
      border-radius: 4px;
    }

    .header-action-button:hover {
      background: var(--litgrid-color-control-hover);
    }

    .header-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      left: auto;
      display: flex;
      flex-direction: column;
      min-width: 180px;
      border: 1px solid var(--litgrid-color-border);
      border-radius: 8px;
      background: var(--litgrid-color-surface);
      box-shadow: var(--litgrid-shadow-menu);
      padding: 6px 0;
      z-index: 10000;
      pointer-events: auto;
    }

    .header-menu-right {
      left: 0;
      right: auto;
    }

    .header-menu button {
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      padding: 10px 12px;
      cursor: pointer;
      color: var(--litgrid-color-text-strong);
      font-size: 13px;
    }

    .header-menu-divider {
      height: 1px;
      margin: 6px 0;
      background: var(--litgrid-color-border-subtle);
      border: none;
    }

    .header-menu button:hover {
      background: var(--litgrid-color-surface-hover);
    }

    .quick-search {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--litgrid-color-border);
      background: var(--litgrid-color-surface-subtle);
    }

    .quick-search input {
      flex: 1;
      min-width: 0;
      border: 1px solid var(--litgrid-color-border);
      border-radius: 6px;
      background: var(--litgrid-color-surface);
      color: var(--litgrid-color-text-strong);
      font: inherit;
      padding: 7px 9px;
    }

    .quick-search button {
      border: 1px solid var(--litgrid-color-border);
      border-radius: 6px;
      background: var(--litgrid-color-surface);
      color: var(--litgrid-color-text-strong);
      font: inherit;
      padding: 7px 9px;
      cursor: pointer;
    }

    .header-filter {
      display: grid;
      gap: 6px;
      padding: 8px 12px;
      border-top: 1px solid var(--litgrid-color-border-subtle);
    }

    .header-filter select,
    .header-filter input {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      border: 1px solid var(--litgrid-color-border);
      border-radius: 4px;
      padding: 6px 8px;
      font: inherit;
    }

    .header-filter-actions {
      display: flex;
      gap: 6px;
    }

    .header-filter-actions button {
      flex: 1;
      padding: 6px 8px;
    }

    .header-filter-indicator {
      margin-left: 4px;
      color: var(--litgrid-color-accent);
      font-size: 14px;
    }

    .resize-handle {
      position: absolute;
      top: 0;
      right: -4px;
      z-index: 1;
      width: 8px;
      height: 100%;
      cursor: col-resize;
      touch-action: none;
    }

    .resize-handle::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 3px;
      width: 1px;
      height: calc(100% - 16px);
      background: var(--litgrid-color-resize-indicator);
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .resize-handle:hover::after {
      opacity: 1;
    }

    .row-resize-handle {
      position: absolute;
      right: 0;
      bottom: -4px;
      left: 0;
      z-index: 2;
      height: 8px;
      cursor: row-resize;
      touch-action: none;
    }

    .row-resize-handle::after {
      content: '';
      position: absolute;
      right: 10px;
      bottom: 3px;
      left: 10px;
      height: 1px;
      background: var(--litgrid-color-resize-indicator);
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .row-resize-handle:hover::after {
      opacity: 1;
    }

    .header-cell:last-child,
    .cell:last-child {
      border-right: 0;
    }

    .column-spacer {
      min-width: 0;
    }

    .header-gutter {
      height: 36px;
      border-left: 1px solid var(--litgrid-color-border-subtle);
      background: var(--litgrid-color-surface-subtle);
    }

    .content {
      box-sizing: border-box;
      transform: translateY(var(--offset-top, 0px));
      width: var(--total-row-width);
    }

    .row {
      box-sizing: border-box;
      width: var(--total-row-width);
      border-bottom: 1px solid var(--litgrid-color-row-border);
      background:
        linear-gradient(90deg, var(--litgrid-color-row-start), var(--litgrid-color-row-end));
    }

    .row-selectable,
    .cell-selectable {
      cursor: pointer;
    }

    .row-selected {
      background: var(--litgrid-color-accent-soft);
      box-shadow: inset 3px 0 0 var(--litgrid-color-accent);
    }

    .row:last-child {
      border-bottom: 0;
    }

    .cell {
      display: flex;
      align-items: center;
      border-right: 1px solid var(--litgrid-color-cell-border);
    }

        .cell-selected {
      background: var(--litgrid-color-accent-selected);
      outline: 2px solid var(--litgrid-color-accent);
      outline-offset: -2px;
    }

    .cell-active {
      outline: 2px solid var(--litgrid-color-accent);
      outline-offset: -2px;
    }


    .row-selected .row-header-cell {
      background: var(--litgrid-color-accent-selected);
      color: var(--litgrid-color-accent-text);
    }

    .selection-checkbox {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: var(--litgrid-color-accent);
      cursor: pointer;
    }

    .selection-checkbox:disabled {
      cursor: default;
    }

            .column-chooser-dialog {
              position: absolute;
              top: 36px;
              right: 8px;
              z-index: 6;
      min-width: 180px;
      padding: 6px;
      border: 1px solid var(--litgrid-color-border);
      border-radius: 6px;
      background: var(--litgrid-color-surface);
      box-shadow: var(--litgrid-shadow-dialog);
    }

        .column-chooser-empty {
      display: flex;
      justify-content: flex-end;
      padding: 6px 8px;
      border-bottom: 1px solid var(--litgrid-color-border-subtle);
      background: var(--litgrid-color-surface-subtle);
    }

    .column-chooser-empty button {
      border: 1px solid var(--litgrid-color-border);
      border-radius: 6px;
      background: var(--litgrid-color-surface);
      color: var(--litgrid-color-text-header);
      font: inherit;
      padding: 4px 8px;
      cursor: pointer;
    }

        .column-chooser-dialog,
        .column-chooser-menu {
          padding-top: 34px;
        }

        .column-chooser-close {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 24px !important;
          min-width: 24px;
          height: 24px;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          color: var(--litgrid-color-text-muted);
          font-size: 20px !important;
          line-height: 1;
          cursor: pointer;
        }

        .column-chooser-dialog label,
        .column-chooser-menu label {
          display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 6px;
      color: var(--litgrid-color-text-header);
      cursor: pointer;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      min-height: 48px;
      padding: 8px 12px;
      border-top: 1px solid var(--litgrid-color-border);
      color: var(--litgrid-color-text-muted);
      font-size: 13px;
    }

    .pagination button,
    .pagination select {
      border: 1px solid var(--litgrid-color-border);
      border-radius: 6px;
      background: var(--litgrid-color-surface);
      color: var(--litgrid-color-text-strong);
      font: inherit;
      padding: 5px 8px;
    }

    .pagination button:not(:disabled) {
      cursor: pointer;
    }

    .pagination button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
      `]; }
    firstUpdated() {
        this.updateScrollbarWidth();
    }
    updated() {
        this.updateScrollbarWidth();
        this.focusActiveCell();
        this.focusHeaderMenu();
        // Detect actual DOM spacer height after render. Some browsers clamp
        // element heights internally; read the measured spacer height and
        // use it for scroll mapping if it's lower than our intended display size.
        try {
            const viewport = this.renderRoot.querySelector('.viewport');
            const spacer = viewport?.firstElementChild;
            if (spacer instanceof HTMLElement) {
                const measured = spacer.offsetHeight || 0;
                if (measured > 0 && measured !== this.lastDisplayTotal) {
                    // Update the measured value for scroll scaling to use.
                    // Don't request update to avoid loops; the scroll handler will use this value.
                    this.lastDisplayTotal = measured;
                }
            }
        }
        catch (e) {
            // ignore
        }
    }
    disconnectedCallback() {
        this.stopColumnResize();
        this.stopRowResize();
        this.stopColumnReorder();
        this.clearQuickSearchDebounce();
        if (this.scrollRAFId !== null) {
            cancelAnimationFrame(this.scrollRAFId);
            this.scrollRAFId = null;
        }
        const viewportElement = this.renderRoot.querySelector('.viewport');
        if (viewportElement) {
            viewportElement.removeEventListener('scroll', this.handleScroll);
        }
        this.headerRowElement = null;
        if (this.measureContainer && this.measureContainer.parentNode) {
            this.measureContainer.parentNode.removeChild(this.measureContainer);
        }
        this.measureContainer = null;
        // call LitElement lifecycle
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (super.disconnectedCallback)
            super.disconnectedCallback();
    }
    updateVirtualizer(next = {}) {
        const options = {
            viewportSize: this.height,
            overscan: this.overscan,
            ...next
        };
        this.height = options.viewportHeight ?? this.height;
        this.overscan = options.overscan;
        this.fixedRowVirtualizer.setOptions({
            rowHeight: this.rowHeight,
            viewportHeight: this.height,
            overscan: this.overscan
        });
        this.variableRowVirtualizer.setOptions(options);
    }
    updateScrollbarWidth() {
        const viewport = this.renderRoot.querySelector('.viewport');
        if (!(viewport instanceof HTMLElement)) {
            return;
        }
        const nextWidth = viewport.offsetWidth - viewport.clientWidth;
        const nextViewportWidth = viewport.clientWidth;
        if (nextWidth !== this.scrollbarWidth || nextViewportWidth !== this.viewportWidth) {
            this.scrollbarWidth = nextWidth;
            this.viewportWidth = nextViewportWidth;
            this.requestUpdate();
        }
    }
    getResolvedColumns() {
        if (this.columnDefs.length > 0) {
            return this.columnDefs;
        }
        const firstRow = this.engine.getRows()[0];
        if (firstRow && typeof firstRow === 'object' && !Array.isArray(firstRow)) {
            return Object.keys(firstRow).map((key) => ({
                key,
                header: key
            }));
        }
        return [
            {
                key: 'value',
                header: 'Value',
                accessor: (row) => row
            }
        ];
    }
    getVisibleColumns() {
        return this.getResolvedColumns().filter((column) => !this.hiddenColumnKeys.has(column.key));
    }
    getColumnWidth(column) {
        return resolveColumnWidth(column, this.columnWidths.get(column.key));
    }
    isRowHeaderEnabled() {
        return this.engine.getConfig().rowHeader.enabled;
    }
    hasCheckboxSelection() {
        const selection = this.engine.getConfig().selection;
        return selection.checkboxes && selection.mode === 'multi-row';
    }
    isRowHeaderVisible() {
        return this.isRowHeaderEnabled() || this.hasCheckboxSelection();
    }
    getRowHeaderWidth() {
        return this.isRowHeaderVisible() ? this.engine.getConfig().rowHeader.width : 0;
    }
    getRowHeight(rowIndex) {
        return this.rowHeights.get(rowIndex) ?? this.rowHeight;
    }
    get bestFitSampleSize() {
        return this._bestFitSampleSize;
    }
    set bestFitSampleSize(value) {
        if (this._bestFitSampleSize === value) {
            return;
        }
        this._bestFitSampleSize = value;
        this.clearBestFitWidths();
    }
    clearBestFitWidths() {
        this.bestFitWidths.clear();
    }
    getBestFitWidth(columnKey, sampleSize) {
        return this.bestFitWidths.get(columnKey)?.get(sampleSize);
    }
    setBestFitWidth(columnKey, sampleSize, width) {
        const widths = this.bestFitWidths.get(columnKey) ?? new Map();
        widths.set(sampleSize, width);
        this.bestFitWidths.set(columnKey, widths);
    }
    getRowSizes() {
        const count = this.engine.getRowCount();
        return Array.from({ length: count }, (_, index) => normalizeRowHeight(this.getRowHeight(index)));
    }
    hasCustomRowHeights() {
        return this.rowHeights.size > 0;
    }
    setRowHeight(rowIndex, height) {
        this.rowHeights.set(rowIndex, normalizeRowHeight(height));
        this.requestUpdate();
    }
    resetRowHeight(rowIndex) {
        this.rowHeights.delete(rowIndex);
        this.requestUpdate();
    }
    resetAllRowHeights() {
        this.rowHeights.clear();
        this.requestUpdate();
    }
    setColumnWidth(columnKey, width) {
        const nextWidth = normalizeColumnWidth(width);
        if (this.columnWidths.get(columnKey) === nextWidth)
            return;
        this.columnWidths.set(columnKey, nextWidth);
        this.requestUpdate();
        this.commitColumnState('resize');
    }
    resetColumnWidth(columnKey) {
        if (!this.columnWidths.delete(columnKey))
            return;
        this.requestUpdate();
        this.commitColumnState('resize');
    }
    resetAllColumnWidths() {
        if (this.columnWidths.size === 0)
            return;
        this.columnWidths.clear();
        this.requestUpdate();
        this.commitColumnState('resize');
    }
    getColumnOrder() {
        return this.getResolvedColumns().map((column) => column.key);
    }
    applyColumnOrder(columnDefs, columnKey, previousIndex, currentIndex) {
        this.columnDefs = columnDefs;
        this.requestUpdate();
        this.dispatchEvent(new CustomEvent('column-reorder', {
            bubbles: true,
            composed: true,
            detail: {
                columnKey,
                previousIndex,
                currentIndex,
                columnOrder: this.getColumnOrder()
            }
        }));
        this.commitColumnState('reorder');
    }
    moveColumn(columnKey, targetIndex) {
        const columns = this.getResolvedColumns();
        const previousIndex = columns.findIndex((column) => column.key === columnKey);
        if (previousIndex < 0)
            return;
        const currentIndex = Math.max(0, Math.min(Math.floor(targetIndex), columns.length - 1));
        if (previousIndex === currentIndex)
            return;
        const nextColumns = [...columns];
        const [column] = nextColumns.splice(previousIndex, 1);
        nextColumns.splice(currentIndex, 0, column);
        this.applyColumnOrder(nextColumns, columnKey, previousIndex, currentIndex);
    }
    setColumnOrder(columnKeys) {
        const columns = this.getResolvedColumns();
        const columnsByKey = new Map(columns.map((column) => [column.key, column]));
        const seen = new Set();
        const orderedColumns = [];
        for (const key of columnKeys) {
            const column = columnsByKey.get(key);
            if (column && !seen.has(key)) {
                seen.add(key);
                orderedColumns.push(column);
            }
        }
        for (const column of columns) {
            if (!seen.has(column.key))
                orderedColumns.push(column);
        }
        const previousOrder = columns.map((column) => column.key);
        const currentOrder = orderedColumns.map((column) => column.key);
        if (previousOrder.every((key, index) => key === currentOrder[index]))
            return;
        this.columnDefs = orderedColumns;
        this.activeCell = null;
        this.requestUpdate();
        this.commitColumnState('reorder');
    }
    resetColumnOrder() {
        const sourceOrder = this.sourceColumnDefs.map((column) => column.key);
        if (this.getColumnOrder().every((key, index) => key === sourceOrder[index]))
            return;
        this.columnDefs = [...this.sourceColumnDefs];
        this.activeCell = null;
        this.requestUpdate();
        this.commitColumnState('reorder');
    }
    setColumnVisible(columnKey, visible) {
        if (!this.getResolvedColumns().some((column) => column.key === columnKey))
            return;
        if (this.isColumnVisible(columnKey) === visible)
            return;
        const activeColumnKey = this.activeCell
            ? this.getVisibleColumns()[this.activeCell.columnIndex]?.key
            : undefined;
        if (visible) {
            this.hiddenColumnKeys.delete(columnKey);
        }
        else {
            this.hiddenColumnKeys.add(columnKey);
        }
        if (this.activeCell) {
            const nextColumnIndex = this.getVisibleColumns().findIndex((column) => column.key === activeColumnKey);
            this.activeCell = nextColumnIndex < 0
                ? null
                : { ...this.activeCell, columnIndex: nextColumnIndex };
        }
        this.requestUpdate();
        this.announceScreenReader(`${this.getColumnLabel(columnKey)} column ${visible ? 'shown' : 'hidden'}.`);
        this.dispatchEvent(new CustomEvent('column-visibility-change', {
            bubbles: true,
            composed: true,
            detail: { columnKey, visible, visibleColumnKeys: this.getVisibleColumnKeys() }
        }));
        this.commitColumnState('visibility');
    }
    isColumnVisible(columnKey) {
        return this.getResolvedColumns().some((column) => column.key === columnKey) && !this.hiddenColumnKeys.has(columnKey);
    }
    getVisibleColumnKeys() {
        return this.getVisibleColumns().map((column) => column.key);
    }
    getColumnState() {
        return createColumnState(this.getResolvedColumns(), this.columnWidths, this.hiddenColumnKeys);
    }
    setColumnState(state) {
        const resolvedState = resolveColumnState(state, this.sourceColumnDefs);
        if (!resolvedState)
            return;
        this.columnDefs = resolvedState.columns;
        this.columnWidths = resolvedState.widths;
        this.hiddenColumnKeys = resolvedState.hiddenKeys;
        this.activeCell = null;
        this.requestUpdate();
        this.commitColumnState('set');
    }
    resetColumnState() {
        this.columnDefs = [...this.sourceColumnDefs];
        this.columnWidths.clear();
        this.hiddenColumnKeys = new Set(this.sourceColumnDefs.filter((column) => column.hidden).map((column) => column.key));
        this.activeCell = null;
        this.removePersistedColumnState();
        this.requestUpdate();
        this.dispatchColumnStateChange('reset');
    }
    getColumnStateStorage() {
        try {
            return globalThis.localStorage;
        }
        catch {
            return null;
        }
    }
    restorePersistedColumnState() {
        if (!this._columnStateStorageKey || this.sourceColumnDefs.length === 0)
            return;
        const storage = this.getColumnStateStorage();
        if (!storage)
            return;
        try {
            const state = parseColumnState(storage.getItem(this._columnStateStorageKey));
            const resolvedState = state && resolveColumnState(state, this.sourceColumnDefs);
            if (!resolvedState)
                return;
            this.columnDefs = resolvedState.columns;
            this.columnWidths = resolvedState.widths;
            this.hiddenColumnKeys = resolvedState.hiddenKeys;
            this.activeCell = null;
            this.requestUpdate();
            this.dispatchColumnStateChange('restore');
        }
        catch {
            // Storage may be unavailable or blocked by browser privacy settings.
        }
    }
    persistColumnState() {
        if (!this._columnStateStorageKey)
            return;
        const storage = this.getColumnStateStorage();
        if (!storage)
            return;
        try {
            storage.setItem(this._columnStateStorageKey, JSON.stringify(this.getColumnState()));
        }
        catch {
            // Persistence is optional; preserve the in-memory state if storage fails.
        }
    }
    removePersistedColumnState() {
        if (!this._columnStateStorageKey)
            return;
        const storage = this.getColumnStateStorage();
        if (!storage)
            return;
        try {
            storage.removeItem(this._columnStateStorageKey);
        }
        catch {
            // Persistence is optional; preserve the in-memory state if storage fails.
        }
    }
    commitColumnState(reason) {
        this.persistColumnState();
        this.dispatchColumnStateChange(reason);
    }
    dispatchColumnStateChange(reason) {
        this.dispatchEvent(new CustomEvent('column-state-change', {
            bubbles: true,
            composed: true,
            detail: { reason, state: this.getColumnState() }
        }));
    }
    resetColumnVisibility() {
        const hiddenColumnKeys = new Set(this.getResolvedColumns().filter((column) => column.hidden).map((column) => column.key));
        for (const column of this.getResolvedColumns()) {
            this.setColumnVisible(column.key, !hiddenColumnKeys.has(column.key));
        }
    }
    toggleHeaderMenu(columnKey, event) {
        event.stopPropagation();
        this.columnChooserOpen = false;
        this.columnChooserPosition = null;
        if (this.activeHeaderMenu !== columnKey) {
            const activeFilter = this.engine.getFilters().find((filter) => filter.columnKey === columnKey);
            this.filterDrafts.set(columnKey, activeFilter ?? {
                columnKey,
                operator: 'contains',
                value: ''
            });
        }
        const isOpening = this.activeHeaderMenu !== columnKey;
        this.activeHeaderMenu = isOpening ? columnKey : null;
        this.headerMenuTrigger = isOpening && event.currentTarget instanceof HTMLButtonElement
            ? event.currentTarget
            : null;
        this.shouldFocusHeaderMenu = isOpening;
        this.requestUpdate();
    }
    closeHeaderMenu(restoreFocus = false) {
        if (this.activeHeaderMenu === null && !this.columnChooserOpen)
            return;
        this.activeHeaderMenu = null;
        this.columnChooserOpen = false;
        this.columnChooserPosition = null;
        this.shouldFocusHeaderMenu = false;
        this.shouldRestoreHeaderMenuFocus = restoreFocus && this.headerMenuTrigger !== null;
        this.requestUpdate();
    }
    toggleColumnChooser(event) {
        if (this.columnChooserOpen) {
            this.closeColumnChooser(true);
            return;
        }
        if (event?.currentTarget instanceof HTMLElement) {
            const shell = this.renderRoot.querySelector('.shell');
            const menu = event.currentTarget.closest('.header-menu');
            const anchorBounds = (menu ?? event.currentTarget).getBoundingClientRect();
            const shellBounds = shell?.getBoundingClientRect();
            this.columnChooserPosition = shellBounds
                ? {
                    left: anchorBounds.left - shellBounds.left,
                    top: anchorBounds.top - shellBounds.top
                }
                : null;
        }
        else {
            this.columnChooserPosition = null;
        }
        this.columnChooserOpen = true;
        this.activeHeaderMenu = null;
        this.shouldFocusHeaderMenu = true;
        this.requestUpdate();
    }
    closeColumnChooser(restoreFocus = false) {
        if (!this.columnChooserOpen)
            return;
        this.columnChooserOpen = false;
        this.columnChooserPosition = null;
        this.shouldFocusHeaderMenu = false;
        this.shouldRestoreHeaderMenuFocus = restoreFocus && this.headerMenuTrigger !== null;
        this.requestUpdate();
    }
    focusHeaderMenu() {
        if (this.shouldRestoreHeaderMenuFocus) {
            this.shouldRestoreHeaderMenuFocus = false;
            this.headerMenuTrigger?.focus();
            this.headerMenuTrigger = null;
            return;
        }
        if (!this.shouldFocusHeaderMenu)
            return;
        const firstControl = this.renderRoot.querySelector('.header-menu button, .header-menu input, .header-menu select, .column-chooser-dialog button, .column-chooser-dialog input');
        if (firstControl) {
            this.shouldFocusHeaderMenu = false;
            firstControl.focus();
        }
    }
    handleShellKeyDown(event) {
        if (event.key !== 'Escape' || (this.activeHeaderMenu === null && !this.columnChooserOpen)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.closeHeaderMenu(true);
    }
    handleViewportFocus(event) {
        if (event.target !== event.currentTarget || this.activeCell) {
            return;
        }
        this.setActiveCell(0, 0);
        this.requestUpdate();
    }
    announceScreenReader(message) {
        if (!this.screenReaderAnnouncements || !message || message === this.lastScreenReaderAnnouncement) {
            return;
        }
        this.lastScreenReaderAnnouncement = message;
        this.screenReaderMessage = message;
        this.requestUpdate();
    }
    getScreenReaderDescription() {
        return this.ariaDescription || 'Use arrow keys to move between cells. Press Enter or Space to select. Press Control or Command C to copy selected cells or rows.';
    }
    getColumnLabel(columnKey) {
        const column = this.getVisibleColumns().find((item) => item.key === columnKey)
            ?? this.getResolvedColumns().find((item) => item.key === columnKey);
        return column?.header ?? columnKey;
    }
    getActiveCellAnnouncement() {
        if (!this.activeCell)
            return '';
        const { rowIndex, columnIndex } = this.activeCell;
        const column = this.getVisibleColumns()[columnIndex];
        const row = this.engine.getVisibleRows(rowIndex, rowIndex + 1)[0];
        if (!column || row === undefined)
            return '';
        const value = this.formatCellValue(this.getCellValue(column, row, rowIndex)) || 'blank';
        const selected = this.isCellSelectionMode()
            ? this.engine.isCellSelected(rowIndex, column.key)
            : this.isRowSelectionMode() && this.engine.isRowSelected(rowIndex);
        return `${this.getColumnLabel(column.key)}, row ${rowIndex + 1} of ${this.engine.getRowCount()}, column ${columnIndex + 1} of ${this.getVisibleColumns().length}, ${value}${selected ? ', selected' : ''}.`;
    }
    announceActiveCell() {
        this.announceScreenReader(this.getActiveCellAnnouncement());
    }
    announceRowSelection(rowIndex) {
        this.announceScreenReader(`Row ${rowIndex + 1} ${this.engine.isRowSelected(rowIndex) ? 'selected' : 'deselected'}.`);
    }
    announceCellSelection(rowIndex, columnKey) {
        this.announceScreenReader(`${this.getColumnLabel(columnKey)}, row ${rowIndex + 1} ${this.engine.isCellSelected(rowIndex, columnKey) ? 'selected' : 'deselected'}.`);
    }
    announceVisibleRowCount(context) {
        const rowCount = this.engine.getRowCount();
        this.announceScreenReader(rowCount === 0 ? `${context}. No matching rows.` : `${context}. ${rowCount} ${rowCount === 1 ? 'row' : 'rows'} shown.`);
    }
    handleSortAscending(columnKey) {
        this.engine.sortBy(columnKey, 'asc');
        this.announceScreenReader(`${this.getColumnLabel(columnKey)} sorted ascending.`);
        this.requestUpdate();
        this.closeHeaderMenu();
    }
    handleSortDescending(columnKey) {
        this.engine.sortBy(columnKey, 'desc');
        this.announceScreenReader(`${this.getColumnLabel(columnKey)} sorted descending.`);
        this.requestUpdate();
        this.closeHeaderMenu();
    }
    handleClearSort() {
        this.engine.clearSort();
        this.announceScreenReader('Sorting cleared.');
        this.requestUpdate();
        this.closeHeaderMenu();
    }
    handleBestFit(columnKey) {
        this.bestFitColumn(columnKey);
        this.closeHeaderMenu();
    }
    handleBestFitAllColumns() {
        this.bestFitAllColumns();
        this.closeHeaderMenu();
    }
    getTextMeasureContext() {
        if (this.textMeasureContext) {
            return this.textMeasureContext;
        }
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Unable to create text measurement context');
        }
        const style = window.getComputedStyle(this);
        context.font = style.font || '14px system-ui';
        this.textMeasureContext = context;
        return context;
    }
    measureTextWidth(text) {
        const context = this.getTextMeasureContext();
        return context.measureText(text).width;
    }
    formatBestFitValue(column, row, rowIndex) {
        if (column.render) {
            const rendered = column.render(this.getCellValue(column, row, rowIndex), row, rowIndex);
            if (typeof rendered === 'string' || typeof rendered === 'number') {
                return String(rendered);
            }
        }
        return String(this.getCellValue(column, row, rowIndex));
    }
    computeColumnBestFit(columnKey, sampleSize = this.bestFitSampleSize) {
        const resolvedColumns = this.getResolvedColumns();
        const column = resolvedColumns.find((item) => item.key === columnKey);
        if (!column) {
            return null;
        }
        const cachedWidth = this.getBestFitWidth(columnKey, sampleSize);
        if (cachedWidth !== undefined) {
            return cachedWidth;
        }
        const rowCount = this.engine.getRowCount();
        const rows = this.engine.getVisibleRows(0, Math.min(rowCount, sampleSize));
        const headerText = column.header ?? column.key;
        const headerWidth = this.measureTextWidth(String(headerText).toUpperCase());
        const headerControlPadding = 44;
        let maxWidth = headerWidth + headerControlPadding;
        // Ensure measurement container exists
        if (!this.measureContainer) {
            try {
                this.measureContainer = document.createElement('div');
                Object.assign(this.measureContainer.style, {
                    position: 'absolute',
                    left: '-9999px',
                    top: '0px',
                    visibility: 'hidden',
                    height: 'auto',
                    width: 'auto',
                    whiteSpace: 'nowrap',
                    overflow: 'visible'
                });
                document.body.appendChild(this.measureContainer);
            }
            catch (e) {
                this.measureContainer = null;
            }
        }
        rows.forEach((row, index) => {
            // Prefer renderer output when available
            if (column.render) {
                const rendered = column.render(this.getCellValue(column, row, index), row, index);
                if (typeof rendered === 'string' || typeof rendered === 'number') {
                    maxWidth = Math.max(maxWidth, this.measureTextWidth(String(rendered)));
                    return;
                }
                // If we have a measurement container, try rendering TemplateResult/Nodes into it
                if (this.measureContainer) {
                    const wrapper = document.createElement('div');
                    wrapper.style.whiteSpace = 'nowrap';
                    this.measureContainer.appendChild(wrapper);
                    try {
                        // Try to render Lit TemplateResult or nodes into the hidden wrapper
                        // If `litRender` fails for this value, fall back to text measurement
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        litRender(rendered, wrapper);
                        maxWidth = Math.max(maxWidth, Math.ceil(wrapper.scrollWidth));
                    }
                    catch (e) {
                        const text = this.formatBestFitValue(column, row, index);
                        maxWidth = Math.max(maxWidth, this.measureTextWidth(text));
                    }
                    finally {
                        // clean up
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        litRender(undefined, wrapper);
                        this.measureContainer.removeChild(wrapper);
                    }
                    return;
                }
            }
            const value = this.formatBestFitValue(column, row, index);
            maxWidth = Math.max(maxWidth, this.measureTextWidth(value));
        });
        const width = normalizeColumnWidth(Math.ceil(maxWidth + 24));
        this.setBestFitWidth(columnKey, sampleSize, width);
        return width;
    }
    getFilterDraft(columnKey) {
        return this.filterDrafts.get(columnKey) ?? {
            columnKey,
            operator: 'contains',
            value: ''
        };
    }
    updateFilterDraft(columnKey, changes) {
        this.filterDrafts.set(columnKey, { ...this.getFilterDraft(columnKey), ...changes });
        this.requestUpdate();
    }
    isValueFreeFilter(operator) {
        return operator === 'isEmpty' || operator === 'isNotEmpty';
    }
    resetVerticalScroll() {
        const viewport = this.renderRoot?.querySelector('.viewport');
        if (viewport) {
            viewport.scrollTop = 0;
        }
        this.pendingScrollTop = 0;
        this.previousPendingScrollTop = 0;
        this.fixedRowVirtualizer.setScrollOffset(0);
        this.variableRowVirtualizer.setScrollOffset(0);
    }
    clearQuickSearchDebounce() {
        if (this.quickSearchDebounceId !== null) {
            clearTimeout(this.quickSearchDebounceId);
            this.quickSearchDebounceId = null;
        }
    }
    applyQuickSearch(query) {
        this.engine.setQuickSearch(query);
        this.resetVerticalScroll();
        this.announceVisibleRowCount(query ? 'Quick search updated' : 'Quick search cleared');
        this.requestUpdate();
    }
    setQuickSearch(query) {
        this.clearQuickSearchDebounce();
        this.quickSearchDraft = query;
        this.applyQuickSearch(query);
    }
    clearQuickSearch() {
        this.setQuickSearch('');
    }
    getQuickSearch() {
        return this.engine.getQuickSearch();
    }
    toggleQuickSearch() {
        this.quickSearchVisible = !this.quickSearchVisible;
        this.closeHeaderMenu();
    }
    handleQuickSearchInput(query) {
        this.quickSearchDraft = query;
        this.clearQuickSearchDebounce();
        const threshold = Math.max(0, Math.floor(this.quickSearchDebounceThreshold));
        const debounceMs = Math.max(0, Math.floor(this.quickSearchDebounceMs));
        if (this.sourceRowCount < threshold || debounceMs === 0) {
            this.applyQuickSearch(query);
            return;
        }
        this.quickSearchDebounceId = setTimeout(() => {
            this.quickSearchDebounceId = null;
            this.applyQuickSearch(query);
        }, debounceMs);
        this.requestUpdate();
    }
    setFilter(filter) {
        this.engine.setFilter(filter);
        this.filterDrafts.set(filter.columnKey, { ...filter });
        this.resetVerticalScroll();
        this.announceVisibleRowCount(`${this.getColumnLabel(filter.columnKey)} filter applied`);
        this.requestUpdate();
    }
    clearFilter(columnKey) {
        this.engine.clearFilter(columnKey);
        if (columnKey) {
            this.filterDrafts.delete(columnKey);
        }
        else {
            this.filterDrafts.clear();
        }
        this.resetVerticalScroll();
        this.announceVisibleRowCount(columnKey ? `${this.getColumnLabel(columnKey)} filter cleared` : 'All filters cleared');
        this.requestUpdate();
    }
    getFilters() {
        return this.engine.getFilters();
    }
    setPage(pageIndex) {
        this.engine.setPage(pageIndex);
        this.resetVerticalScroll();
        const pagination = this.engine.getPagination();
        this.announceScreenReader(`Page ${pagination.pageCount === 0 ? 0 : pagination.pageIndex + 1} of ${pagination.pageCount}.`);
        this.requestUpdate();
    }
    setPageSize(pageSize) {
        this.engine.setPageSize(pageSize);
        this.resetVerticalScroll();
        const pagination = this.engine.getPagination();
        this.announceScreenReader(`${pagination.pageSize} rows per page. Page ${pagination.pageCount === 0 ? 0 : pagination.pageIndex + 1} of ${pagination.pageCount}.`);
        this.requestUpdate();
    }
    getPagination() {
        return this.engine.getPagination();
    }
    getTotalRowCount() {
        return this.engine.getTotalRowCount();
    }
    selectRow(rowIndex, intent) {
        this.engine.selectRow(rowIndex, intent);
        this.announceRowSelection(rowIndex);
        this.requestUpdate();
    }
    selectAllRows() {
        this.engine.selectAllRows();
        this.announceScreenReader(`All ${this.engine.getRowCount()} displayed rows selected.`);
        this.requestUpdate();
    }
    clearSelection() {
        this.engine.clearSelection();
        this.announceScreenReader('Selection cleared.');
        this.requestUpdate();
    }
    getSelection() {
        return this.engine.getSelection();
    }
    isRowSelected(rowIndex) {
        return this.engine.isRowSelected(rowIndex);
    }
    isCellSelected(rowIndex, columnKey) {
        return this.engine.isCellSelected(rowIndex, columnKey);
    }
    getSelectedCellsClipboardText() {
        return serializeSelectedCells({
            selection: this.engine.getSelection(),
            rows: this.engine.getRows(),
            columns: this.getVisibleColumns(),
            getCellValue: (column, row, rowIndex) => this.getCellValue(column, row, rowIndex),
            formatValue: (value) => this.formatCellValue(value)
        });
    }
    async copySelectedCells() {
        const text = this.getSelectedCellsClipboardText();
        if (text === null || !navigator.clipboard?.writeText) {
            return false;
        }
        try {
            await navigator.clipboard.writeText(text);
            return true;
        }
        catch {
            return false;
        }
    }
    getSelectedRowsClipboardText() {
        return serializeSelectedRows({
            selection: this.engine.getSelection(),
            rows: this.engine.getRows(),
            columns: this.getVisibleColumns(),
            getCellValue: (column, row, rowIndex) => this.getCellValue(column, row, rowIndex),
            formatValue: (value) => this.formatCellValue(value)
        });
    }
    async copySelectedRows() {
        const text = this.getSelectedRowsClipboardText();
        if (text === null || !navigator.clipboard?.writeText) {
            return false;
        }
        try {
            await navigator.clipboard.writeText(text);
            return true;
        }
        catch {
            return false;
        }
    }
    applyHeaderFilter(columnKey) {
        const filter = this.getFilterDraft(columnKey);
        this.setFilter({
            ...filter,
            value: this.isValueFreeFilter(filter.operator) ? undefined : filter.value
        });
        this.closeHeaderMenu();
    }
    clearHeaderFilter(columnKey) {
        this.clearFilter(columnKey);
        this.closeHeaderMenu();
    }
    isColumnFiltered(columnKey) {
        return this.engine.getFilters().some((filter) => filter.columnKey === columnKey);
    }
    bestFitColumn(columnKey) {
        const width = this.computeColumnBestFit(columnKey);
        if (width !== null) {
            this.setColumnWidth(columnKey, width);
        }
        return width;
    }
    bestFitAllColumns() {
        const columns = this.getVisibleColumns();
        const widths = columns.map((column) => ({
            key: column.key,
            width: this.computeColumnBestFit(column.key)
        }));
        widths.forEach((item) => {
            if (item.width !== null) {
                this.setColumnWidth(item.key, item.width);
            }
        });
        return widths;
    }
    startBodyResize(cursor) {
        this.previousBodyCursor = document.body.style.cursor;
        this.previousBodyUserSelect = document.body.style.userSelect;
        document.body.style.cursor = cursor;
        document.body.style.userSelect = 'none';
    }
    stopBodyResize() {
        document.body.style.cursor = this.previousBodyCursor;
        document.body.style.userSelect = this.previousBodyUserSelect;
    }
    startColumnReorder(event, column) {
        if (event.button !== 0 || this.columnResizeState || event.target.closest('button, input, select, .resize-handle')) {
            return;
        }
        const sourceIndex = this.getResolvedColumns().findIndex((item) => item.key === column.key);
        if (sourceIndex < 0)
            return;
        event.preventDefault();
        this.columnReorderState = {
            columnKey: column.key,
            startX: event.clientX,
            sourceIndex,
            targetIndex: sourceIndex,
            hasMoved: false
        };
        window.addEventListener('pointermove', this.handleColumnReorder);
        window.addEventListener('pointerup', this.stopColumnReorder);
        window.addEventListener('pointercancel', this.stopColumnReorder);
    }
    updateColumnDragPreview(columnKey, clientX, clientY) {
        if (!this.columnDragPreview) {
            const column = this.getResolvedColumns().find((item) => item.key === columnKey);
            const source = this.renderRoot.querySelector(`.header-cell[data-column-key="${columnKey}"]`);
            if (!column || !source)
                return;
            const bounds = source.getBoundingClientRect();
            const theme = getComputedStyle(this);
            const preview = document.createElement('div');
            preview.textContent = column.header ?? column.key;
            Object.assign(preview.style, {
                position: 'fixed',
                zIndex: '10001',
                boxSizing: 'border-box',
                width: `${bounds.width}px`,
                height: `${bounds.height}px`,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                border: `1px solid ${theme.getPropertyValue('--litgrid-color-accent')}`,
                borderRadius: '4px',
                background: theme.getPropertyValue('--litgrid-color-surface'),
                color: theme.getPropertyValue('--litgrid-color-text-header'),
                font: '700 12px/1.4 system-ui, sans-serif',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                boxShadow: theme.getPropertyValue('--litgrid-shadow-dialog'),
                opacity: '0.95',
                pointerEvents: 'none'
            });
            document.body.appendChild(preview);
            this.columnDragPreview = preview;
        }
        const preview = this.columnDragPreview;
        preview.style.left = `${clientX - preview.offsetWidth / 2}px`;
        preview.style.top = `${clientY - preview.offsetHeight / 2}px`;
    }
    removeColumnDragPreview() {
        this.columnDragPreview?.remove();
        this.columnDragPreview = null;
    }
    getGridCellId(rowIndex, columnIndex) {
        return `${this.gridId}-cell-${rowIndex}-${columnIndex}`;
    }
    getHeaderRowId() {
        return `${this.gridId}-header-row`;
    }
    getHeaderMenuId(columnKey) {
        return `${this.gridId}-header-menu-${encodeURIComponent(columnKey)}`;
    }
    getRowHeaderColumnHeaderId() {
        return `${this.gridId}-row-header-columnheader`;
    }
    getAriaColumnIndex(columnIndex) {
        return columnIndex + (this.isRowHeaderVisible() ? 2 : 1);
    }
    getHeaderSortDirection(columnKey) {
        const sort = this.engine.getSort();
        return sort.columnKey === columnKey && sort.direction
            ? sort.direction === 'asc' ? 'ascending' : 'descending'
            : 'none';
    }
    getHeaderCellClass(column) {
        const classes = ['header-cell'];
        const state = this.columnReorderState;
        if (!state || !state.hasMoved)
            return classes.join(' ');
        if (state.columnKey === column.key)
            classes.push('header-cell-reordering');
        const columnIndex = this.getResolvedColumns().findIndex((item) => item.key === column.key);
        if (columnIndex === state.targetIndex && state.sourceIndex !== state.targetIndex) {
            classes.push(state.sourceIndex < state.targetIndex ? 'header-cell-drop-after' : 'header-cell-drop-before');
        }
        return classes.join(' ');
    }
    startColumnResize(event, column) {
        event.preventDefault();
        event.stopPropagation();
        this.columnResizeState = {
            columnKey: column.key,
            startX: event.clientX,
            startWidth: this.getColumnWidth(column)
        };
        this.startBodyResize('col-resize');
        window.addEventListener('pointermove', this.handleColumnResize);
        window.addEventListener('pointerup', this.stopColumnResize);
    }
    startRowResize(event, rowIndex) {
        event.preventDefault();
        event.stopPropagation();
        this.rowResizeState = {
            rowIndex,
            startY: event.clientY,
            startHeight: this.getRowHeight(rowIndex)
        };
        this.startBodyResize('row-resize');
        window.addEventListener('pointermove', this.handleRowResize);
        window.addEventListener('pointerup', this.stopRowResize);
    }
    getCellValue(column, row, rowIndex) {
        if (column.accessor) {
            return column.accessor(row, rowIndex);
        }
        if (row && typeof row === 'object' && column.key in row) {
            return row[column.key];
        }
        return '';
    }
    formatCellValue(value) {
        if (value == null) {
            return '';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }
    getSelectionMode() {
        return this.engine.getSelection().mode;
    }
    isRowSelectionMode() {
        const mode = this.getSelectionMode();
        return mode === 'row' || mode === 'multi-row';
    }
    isCellSelectionMode() {
        const mode = this.getSelectionMode();
        return mode === 'cell' || mode === 'multi-cell';
    }
    getRowClass(rowIndex) {
        const classes = ['row'];
        if (this.isRowSelectionMode()) {
            classes.push('row-selectable');
        }
        if (this.engine.isRowSelected(rowIndex)) {
            classes.push('row-selected');
        }
        return classes.join(' ');
    }
    getCellClass(rowIndex, columnKey) {
        const classes = ['cell'];
        if (this.isCellSelectionMode()) {
            classes.push('cell-selectable');
        }
        if (this.engine.isCellSelected(rowIndex, columnKey)) {
            classes.push('cell-selected');
        }
        if (this.activeCell?.rowIndex === rowIndex && this.getVisibleColumns()[this.activeCell.columnIndex]?.key === columnKey) {
            classes.push('cell-active');
        }
        return classes.join(' ');
    }
    setActiveCell(rowIndex, columnIndex, shouldFocus = false) {
        const rowCount = this.engine.getRowCount();
        const columnCount = this.getVisibleColumns().length;
        if (rowCount === 0 || columnCount === 0) {
            this.activeCell = null;
            return;
        }
        this.activeCell = {
            rowIndex: Math.max(0, Math.min(rowIndex, rowCount - 1)),
            columnIndex: Math.max(0, Math.min(columnIndex, columnCount - 1))
        };
        this.shouldFocusActiveCell = shouldFocus;
        this.announceActiveCell();
    }
    focusActiveCell() {
        if (!this.shouldFocusActiveCell || !this.activeCell) {
            return;
        }
        const cell = this.renderRoot.querySelector(`.cell[data-row-index="${this.activeCell.rowIndex}"][data-column-index="${this.activeCell.columnIndex}"]`);
        if (cell) {
            this.shouldFocusActiveCell = false;
            cell.focus();
        }
    }
    getRowIndexAtOffset(offset) {
        const rowCount = this.engine.getRowCount();
        if (rowCount === 0) {
            return 0;
        }
        if (!this.hasCustomRowHeights()) {
            return Math.max(0, Math.min(Math.floor(offset / this.rowHeight), rowCount - 1));
        }
        const rowSizes = this.getRowSizes();
        const rowOffsets = new Array(rowCount + 1);
        rowOffsets[0] = 0;
        for (let index = 0; index < rowCount; index += 1) {
            rowOffsets[index + 1] = rowOffsets[index] + rowSizes[index];
        }
        const targetOffset = Math.max(0, Math.min(offset, rowOffsets[rowCount] - 1));
        let low = 0;
        let high = rowCount - 1;
        while (low <= high) {
            const middle = Math.floor((low + high) / 2);
            const middleOffset = rowOffsets[middle];
            const middleBottom = rowOffsets[middle + 1];
            if (targetOffset < middleOffset) {
                high = middle - 1;
            }
            else if (targetOffset >= middleBottom) {
                low = middle + 1;
            }
            else {
                return middle;
            }
        }
        return Math.max(0, Math.min(low, rowCount - 1));
    }
    getPageNavigationRowIndex(rowIndex, direction) {
        const rowTop = this.hasCustomRowHeights()
            ? this.getRowSizes().slice(0, rowIndex).reduce((total, height) => total + height, 0)
            : rowIndex * this.rowHeight;
        return this.getRowIndexAtOffset(rowTop + direction * this.height);
    }
    getTabNavigationCell(direction, rowCount, columnCount) {
        if (!this.activeCell) {
            return direction === 1
                ? { rowIndex: 0, columnIndex: 0 }
                : { rowIndex: rowCount - 1, columnIndex: columnCount - 1 };
        }
        const nextIndex = this.activeCell.rowIndex * columnCount + this.activeCell.columnIndex + direction;
        if (nextIndex < 0 || nextIndex >= rowCount * columnCount) {
            return null;
        }
        return {
            rowIndex: Math.floor(nextIndex / columnCount),
            columnIndex: nextIndex % columnCount
        };
    }
    scrollActiveCellIntoView() {
        const viewport = this.viewportElement ?? this.renderRoot.querySelector('.viewport');
        const activeCell = this.activeCell;
        if (!viewport || !activeCell) {
            return;
        }
        const rowTop = this.hasCustomRowHeights()
            ? this.getRowSizes().slice(0, activeCell.rowIndex).reduce((total, height) => total + height, 0)
            : activeCell.rowIndex * this.rowHeight;
        const rowBottom = rowTop + this.getRowHeight(activeCell.rowIndex);
        const displayTotal = this.lastDisplayTotal || this.lastTotalSize;
        const availableVirtualSize = Math.max(0, this.lastTotalSize - this.height);
        const availableDisplaySize = Math.max(0, displayTotal - this.height);
        const currentVirtualOffset = availableDisplaySize > 0
            ? (viewport.scrollTop * availableVirtualSize) / availableDisplaySize
            : 0;
        let nextVirtualOffset = currentVirtualOffset;
        if (rowTop < currentVirtualOffset) {
            nextVirtualOffset = rowTop;
        }
        else if (rowBottom > currentVirtualOffset + this.height) {
            nextVirtualOffset = rowBottom - this.height;
        }
        if (nextVirtualOffset !== currentVirtualOffset) {
            viewport.scrollTop = availableVirtualSize > 0
                ? (Math.max(0, Math.min(nextVirtualOffset, availableVirtualSize)) * availableDisplaySize) / availableVirtualSize
                : 0;
        }
        const columns = this.getVisibleColumns();
        const columnLeft = columns
            .slice(0, activeCell.columnIndex)
            .reduce((total, column) => total + this.getColumnWidth(column), 0);
        const columnRight = columnLeft + this.getColumnWidth(columns[activeCell.columnIndex]);
        const bodyViewportWidth = Math.max(0, viewport.clientWidth - this.getRowHeaderWidth());
        if (columnLeft < viewport.scrollLeft) {
            viewport.scrollLeft = columnLeft;
        }
        else if (columnRight > viewport.scrollLeft + bodyViewportWidth) {
            viewport.scrollLeft = Math.max(0, columnRight - bodyViewportWidth);
        }
    }
    handleKeyDown(event) {
        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLButtonElement) {
            return;
        }
        const rowCount = this.engine.getRowCount();
        const columnCount = this.getVisibleColumns().length;
        if (rowCount === 0 || columnCount === 0) {
            return;
        }
        if ((event.key === 'Enter' || event.key === ' ') && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const activeCell = this.activeCell ?? { rowIndex: 0, columnIndex: 0 };
            if (this.isCellSelectionMode()) {
                const column = this.getVisibleColumns()[activeCell.columnIndex];
                if (column) {
                    event.preventDefault();
                    this.engine.selectCell(activeCell.rowIndex, column.key);
                    this.announceCellSelection(activeCell.rowIndex, column.key);
                    this.requestUpdate();
                }
            }
            else if (this.isRowSelectionMode()) {
                event.preventDefault();
                this.engine.selectRow(activeCell.rowIndex, 'replace');
                this.announceRowSelection(activeCell.rowIndex);
                this.requestUpdate();
            }
            return;
        }
        if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'c') {
            const cellText = this.getSelectedCellsClipboardText();
            const rowText = cellText === null ? this.getSelectedRowsClipboardText() : null;
            if (cellText !== null || rowText !== null) {
                event.preventDefault();
                void (cellText !== null ? this.copySelectedCells() : this.copySelectedRows());
            }
            return;
        }
        if (event.key === 'Tab') {
            const nextCell = this.getTabNavigationCell(event.shiftKey ? -1 : 1, rowCount, columnCount);
            if (!nextCell) {
                return;
            }
            event.preventDefault();
            this.setActiveCell(nextCell.rowIndex, nextCell.columnIndex, true);
            this.scrollActiveCellIntoView();
            this.requestUpdate();
            return;
        }
        const activeCell = this.activeCell ?? { rowIndex: 0, columnIndex: 0 };
        const deltas = {
            ArrowUp: { rowIndex: -1, columnIndex: 0 },
            ArrowDown: { rowIndex: 1, columnIndex: 0 },
            ArrowLeft: { rowIndex: 0, columnIndex: -1 },
            ArrowRight: { rowIndex: 0, columnIndex: 1 }
        };
        const delta = deltas[event.key];
        const isGridBoundaryNavigation = event.ctrlKey || event.metaKey;
        let nextCell = null;
        if (delta) {
            nextCell = {
                rowIndex: activeCell.rowIndex + delta.rowIndex,
                columnIndex: activeCell.columnIndex + delta.columnIndex
            };
        }
        else if (event.key === 'Home') {
            nextCell = {
                rowIndex: isGridBoundaryNavigation ? 0 : activeCell.rowIndex,
                columnIndex: 0
            };
        }
        else if (event.key === 'End') {
            nextCell = {
                rowIndex: isGridBoundaryNavigation ? rowCount - 1 : activeCell.rowIndex,
                columnIndex: columnCount - 1
            };
        }
        else if (event.key === 'PageUp' || event.key === 'PageDown') {
            nextCell = {
                rowIndex: this.getPageNavigationRowIndex(activeCell.rowIndex, event.key === 'PageUp' ? -1 : 1),
                columnIndex: activeCell.columnIndex
            };
        }
        if (!nextCell) {
            return;
        }
        event.preventDefault();
        this.setActiveCell(nextCell.rowIndex, nextCell.columnIndex, true);
        this.scrollActiveCellIntoView();
        this.requestUpdate();
    }
    getRowSelectionIntent(event) {
        if (event.shiftKey) {
            return 'range';
        }
        if (event.ctrlKey || event.metaKey) {
            return 'toggle';
        }
        return 'replace';
    }
    handleRowClick(event, rowIndex) {
        if (!this.isRowSelectionMode()) {
            return;
        }
        this.engine.selectRow(rowIndex, this.getRowSelectionIntent(event));
        this.announceRowSelection(rowIndex);
        this.requestUpdate();
    }
    handleRowMouseDown(event) {
        if (this.isRowSelectionMode() && event.shiftKey) {
            event.preventDefault();
        }
    }
    handleCellClick(event, rowIndex, column) {
        this.setActiveCell(rowIndex, this.getVisibleColumns().findIndex((item) => item.key === column.key));
        if (!this.isCellSelectionMode()) {
            this.requestUpdate();
            return;
        }
        event.stopPropagation();
        this.engine.selectCell(rowIndex, column.key);
        this.announceCellSelection(rowIndex, column.key);
        this.requestUpdate();
    }
    renderCell(column, row, rowIndex) {
        const value = this.getCellValue(column, row, rowIndex);
        const rendered = column.render
            ? column.render(value, row, rowIndex)
            : this.formatCellValue(value);
        const content = typeof rendered === 'string' || typeof rendered === 'number'
            ? html `${rendered}`
            : rendered;
        return html `
                        <div
        id=${this.getGridCellId(rowIndex, this.getVisibleColumns().findIndex((item) => item.key === column.key))}
        class=${this.getCellClass(rowIndex, column.key)}
        role="gridcell"
        aria-colindex=${this.getAriaColumnIndex(this.getVisibleColumns().findIndex((item) => item.key === column.key))}
        aria-selected=${this.isCellSelectionMode() ? String(this.engine.isCellSelected(rowIndex, column.key)) : undefined}
        data-row-index=${rowIndex}
        data-column-index=${this.getVisibleColumns().findIndex((item) => item.key === column.key)}
        tabindex=${this.activeCell?.rowIndex === rowIndex && this.getVisibleColumns()[this.activeCell.columnIndex]?.key === column.key ? '0' : '-1'}
        @click=${(event) => this.handleCellClick(event, rowIndex, column)}
      >

        ${cache(content)}
      </div>
    `;
    }
    renderRowHeader(rowIndex) {
        if (!this.isRowHeaderVisible()) {
            return '';
        }
        return html `
            <div class="row-header-cell" role="rowheader" aria-colindex="1">
        ${this.hasCheckboxSelection()
            ? html `<input
              class="selection-checkbox"
              type="checkbox"
              aria-label=${`Select row ${rowIndex + 1}`}
              .checked=${this.engine.isRowSelected(rowIndex)}
              @click=${(event) => event.stopPropagation()}
              @change=${() => this.handleRowCheckboxChange(rowIndex)}
            />`
            : html `<span>${rowIndex + 1}</span>`}
        <span
          class="row-resize-handle"
          aria-hidden="true"
          @pointerdown=${(event) => this.startRowResize(event, rowIndex)}
        ></span>
      </div>
    `;
    }
    set data(value) {
        this.activeCell = null;
        this.clearQuickSearchDebounce();
        this.sourceRowCount = Array.isArray(value) ? value.length : 0;
        this.engine.setData(value ?? []);
        this.quickSearchDraft = this.engine.getQuickSearch();
        this.clearBestFitWidths();
        this.announceScreenReader(this.engine.getRowCount() === 0 ? 'Grid is empty.' : `${this.engine.getRowCount()} ${this.engine.getRowCount() === 1 ? 'row' : 'rows'} loaded.`);
        this.requestUpdate();
    }
    handleRowCheckboxChange(rowIndex) {
        this.engine.selectRow(rowIndex, 'toggle');
        this.announceRowSelection(rowIndex);
        this.requestUpdate();
    }
    getDisplayedSelectedRowCount() {
        const rowCount = this.engine.getRowCount();
        let selectedCount = 0;
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
            if (this.engine.isRowSelected(rowIndex)) {
                selectedCount += 1;
            }
        }
        return selectedCount;
    }
    areAllDisplayedRowsSelected() {
        const rowCount = this.engine.getRowCount();
        return rowCount > 0 && this.getDisplayedSelectedRowCount() === rowCount;
    }
    hasPartiallySelectedDisplayedRows() {
        const selectedCount = this.getDisplayedSelectedRowCount();
        return selectedCount > 0 && selectedCount < this.engine.getRowCount();
    }
    handleSelectAllRows() {
        if (this.areAllDisplayedRowsSelected()) {
            this.engine.clearSelection();
            this.announceScreenReader('All displayed rows deselected.');
        }
        else {
            this.engine.selectAllRows();
            this.announceScreenReader(`All ${this.engine.getRowCount()} displayed rows selected.`);
        }
        this.requestUpdate();
    }
    set columns(value) {
        this.activeCell = null;
        this.sourceColumnDefs = Array.isArray(value) ? [...value] : [];
        this.columnDefs = [...this.sourceColumnDefs];
        this.hiddenColumnKeys = new Set(this.sourceColumnDefs.filter((column) => column.hidden).map((column) => column.key));
        this.clearBestFitWidths();
        this.restorePersistedColumnState();
        this.requestUpdate();
    }
    get columnStateStorageKey() {
        return this._columnStateStorageKey;
    }
    set columnStateStorageKey(value) {
        const nextKey = typeof value === 'string' && value.trim() ? value : null;
        if (this._columnStateStorageKey === nextKey)
            return;
        this._columnStateStorageKey = nextKey;
        this.restorePersistedColumnState();
    }
    set config(value) {
        this.engine.setConfig(value ?? {});
        this.requestUpdate();
    }
    set viewportHeight(value) {
        this.updateVirtualizer({
            viewportHeight: Number(value)
        });
        this.requestUpdate();
    }
    set overscanCount(value) {
        this.updateVirtualizer({
            overscan: Number(value)
        });
        this.requestUpdate();
    }
    set columnOverscanCount(value) {
        this.columnOverscan = Number(value);
        this.requestUpdate();
    }
    set virtualRowHeight(value) {
        this.rowHeight = Number(value);
        this.requestUpdate();
    }
    render() {
        const count = this.engine.getRowCount();
        const pagination = this.engine.getPagination();
        const pageSizeOptions = [25, 50, 100].includes(pagination.pageSize)
            ? [25, 50, 100]
            : [pagination.pageSize, 25, 50, 100].sort((left, right) => left - right);
        const useVariableRows = this.hasCustomRowHeights();
        if (useVariableRows) {
            const rowSizes = this.getRowSizes();
            this.variableRowVirtualizer.setOptions({
                sizes: rowSizes,
                viewportSize: this.height,
                overscan: this.overscan
            });
        }
        else {
            this.fixedRowVirtualizer.setOptions({
                rowHeight: this.rowHeight,
                viewportHeight: this.height,
                overscan: this.overscan
            });
        }
        const range = useVariableRows
            ? this.variableRowVirtualizer.getState()
            : this.fixedRowVirtualizer.getState(count);
        const totalSize = range.totalSize;
        // Intended display size (what we *want* the spacer to be)
        const intendedDisplayTotal = Math.min(totalSize, this.maxScrollableHeight);
        // A transformed row-count change invalidates any prior measured spacer
        // height. Render the new intended height first; `updated()` will replace
        // it only if the browser clamps the spacer in the DOM.
        const totalSizeChanged = totalSize !== this.lastTotalSize;
        // If we've measured a clamped spacer height in `updated()`, prefer
        // the measured value when it's smaller than the intended display size.
        const displayTotal = !totalSizeChanged && this.lastDisplayTotal > 0 && this.lastDisplayTotal < intendedDisplayTotal
            ? this.lastDisplayTotal
            : intendedDisplayTotal;
        // Compute displayed offset for the content by scaling the virtualizer's
        // `offsetTop` into display coordinates. This keeps the translated content
        // aligned with the virtualizer even when the browser clamps the spacer.
        const virtualOffsetTop = range.offsetTop;
        const renderedSize = range.visibleSize;
        const bottomPadding = range.bottomPadding;
        const { displayBottomPadding, displayOffsetTop, displayScale } = calculateDisplayLayout({
            totalSize,
            displaySize: displayTotal,
            virtualOffsetTop,
            visibleSize: renderedSize,
            bottomPadding
        });
        // If the mapped display offset differs substantially from the user's
        // actual scrollTop, log for diagnostics (helps catch mapping/race issues).
        if (this.lastDisplayTotal > 0) {
            const diff = Math.abs(displayOffsetTop - this.pendingScrollTop);
            if (diff > Math.max(100, this.rowHeight)) {
                // eslint-disable-next-line no-console
                console.log('[yc-grid] offset-mismatch', { displayOffsetTop, pendingScrollTop: this.pendingScrollTop, diff });
            }
        }
        // Keep scroll mapping in sync with the newly rendered spacer until a
        // browser measurement provides a lower, clamped height.
        this.lastTotalSize = totalSize;
        if (totalSizeChanged || !this.lastDisplayTotal) {
            this.lastDisplayTotal = displayTotal;
        }
        if (totalSize > 6000000) {
            // eslint-disable-next-line no-console
            console.log('[yc-grid] virtualizer state', {
                count,
                totalSize,
                displayTotal,
                displayScale,
                offsetTop: range.offsetTop,
                bottomPadding,
                startIndex: range.startIndex,
                endIndex: range.endIndex
            });
        }
        // Ensure start/end indices are within valid bounds to avoid empty renders
        const safeStartIndex = Math.max(0, Math.min(range.startIndex, Math.max(0, count)));
        const safeEndIndex = Math.max(safeStartIndex, Math.min(range.endIndex, count));
        let rows = this.engine.getVisibleRows(safeStartIndex, safeEndIndex);
        if (rows.length === 0 && count > 0) {
            // If we ended up with no rows (edge-case due to rounding/clamping),
            // request the last page of rows as a fallback so the grid never appears empty.
            const visibleCountFallback = Math.max(1, Math.ceil(this.height / Math.max(1, this.rowHeight)));
            const fallbackStart = Math.max(0, count - visibleCountFallback);
            const fallbackEnd = count;
            // eslint-disable-next-line no-console
            console.log('[yc-grid] empty-render-fallback', { safeStartIndex, safeEndIndex, fallbackStart, fallbackEnd });
            rows = this.engine.getVisibleRows(fallbackStart, fallbackEnd);
        }
        const columns = this.getVisibleColumns();
        const columnWidths = columns.map((column) => this.getColumnWidth(column));
        const rowHeaderWidth = this.getRowHeaderWidth();
        this.columnVirtualizer.setOptions({
            sizes: columnWidths,
            viewportSize: Math.max(0, this.viewportWidth - rowHeaderWidth),
            overscan: this.columnOverscan
        });
        const columnRange = this.columnVirtualizer.getState();
        const visibleColumns = columns.slice(columnRange.startIndex, columnRange.endIndex);
        const visibleColumnWidths = columnWidths.slice(columnRange.startIndex, columnRange.endIndex);
        const isFirstVisibleColumn = (column, index) => index === 0;
        const gridTemplate = [
            ...(this.isRowHeaderVisible() ? [`${rowHeaderWidth}px`] : []),
            `${columnRange.leftPadding}px`,
            ...visibleColumnWidths.map((width) => `${width}px`),
            `${columnRange.rightPadding}px`
        ].join(' ');
        const columnGridTemplate = [
            `${columnRange.leftPadding}px`,
            ...visibleColumnWidths.map((width) => `${width}px`),
            `${columnRange.rightPadding}px`
        ].join(' ');
        const totalColumnWidth = columnRange.totalSize;
        const totalRowWidth = totalColumnWidth + rowHeaderWidth;
        const headerGridTemplate = this.isRowHeaderVisible()
            ? `${rowHeaderWidth}px minmax(0, 1fr) ${this.scrollbarWidth}px`
            : `minmax(0, 1fr) ${this.scrollbarWidth}px`;
        return html `
            <div
        class="shell"
        style=${`--virtual-grid-template: ${gridTemplate}; --total-column-width: ${totalColumnWidth}px; --total-row-width: ${totalRowWidth}px; --row-header-width: ${rowHeaderWidth}px; --header-grid-template: ${headerGridTemplate}; --scrollbar-width: ${this.scrollbarWidth}px;`}
        @keydown=${this.handleShellKeyDown}
        >
        <p id=${`${this.gridId}-description`} class="screen-reader-only">${this.getScreenReaderDescription()}</p>
        ${this.screenReaderAnnouncements
            ? html `<div class="screen-reader-only" role="status" aria-live="polite" aria-atomic="true">${this.screenReaderMessage}</div>`
            : ''}
        ${this.quickSearchVisible
            ? html `
              <div class="quick-search" role="search">
                <input
                  aria-label="Quick search"
                  placeholder="Search all columns"
                  .value=${this.quickSearchDraft}
                  @input=${(event) => this.handleQuickSearchInput(event.target.value)}
                />
                <button type="button" @click=${() => this.clearQuickSearch()}>Clear</button>
              </div>
            `
            : ''}
                        ${this.columnChooserOpen
            ? html `<div
                              class="column-chooser-dialog"
                              role="dialog"
                              aria-label="Columns"
                              style=${this.columnChooserPosition
                ? `left: ${this.columnChooserPosition.left}px; top: ${this.columnChooserPosition.top}px; right: auto;`
                : ''}
                            >
              <button class="column-chooser-close" type="button" aria-label="Close columns" @click=${() => this.closeColumnChooser(true)}>×</button>
              ${this.getResolvedColumns().map((column) => html `
                <label>
                  <input
                    type="checkbox"
                    .checked=${this.isColumnVisible(column.key)}
                    @change=${(event) => this.setColumnVisible(column.key, event.target.checked)}
                  />
                  ${column.header ?? column.key}
                </label>
              `)}
            </div>`
            : ''}
        <div class="header-shell">
          ${this.isRowHeaderVisible()
            ? html `
                                <div id=${this.getRowHeaderColumnHeaderId()} class="row-header-cell header-row-header" role="columnheader" aria-colindex="1">
                  ${this.hasCheckboxSelection()
                ? html `<input
                        class="selection-checkbox"
                        type="checkbox"
                        aria-label="Select all displayed rows"
                        .checked=${this.areAllDisplayedRowsSelected()}
                        .indeterminate=${this.hasPartiallySelectedDisplayedRows()}
                        ?disabled=${this.engine.getRowCount() === 0}
                        @change=${() => this.handleSelectAllRows()}
                      />`
                : html `<span>#</span>`}
                </div>
              `
            : ''}
          <div class="header-clip">
                        <div
                            id=${this.getHeaderRowId()}
              class="header-column-row"
                            role="row"
              aria-rowindex="1"
              aria-owns=${this.isRowHeaderVisible() ? this.getRowHeaderColumnHeaderId() : undefined}
              style=${`grid-template-columns: ${columnGridTemplate}; transform: translateX(${-this.horizontalScrollLeft}px);`}
            >
              <div class="column-spacer" aria-hidden="true"></div>
              ${visibleColumns.map((column, columnIndex) => html `
                  <div
                    class=${this.getHeaderCellClass(column)}
                    role="columnheader"
                    aria-colindex=${this.getAriaColumnIndex(columnRange.startIndex + columnIndex)}
                    aria-sort=${this.getHeaderSortDirection(column.key)}
                    data-column-key=${column.key}
                    @pointerdown=${(event) => this.startColumnReorder(event, column)}
                    @click=${() => this.closeHeaderMenu()}
                  >
                    <span class="header-label">${column.header ?? column.key}</span>
                    ${this.isColumnFiltered(column.key)
            ? html `<span class="header-filter-indicator" aria-label="Filter active">●</span>`
            : ''}
                    <div class="header-actions" @click=${(event) => event.stopPropagation()}>
                      <button
                        class="header-action-button"
                        @click=${(event) => this.toggleHeaderMenu(column.key, event)}
                        aria-label="Show column actions"
                        aria-haspopup="dialog"
                        aria-controls=${this.getHeaderMenuId(column.key)}
                        aria-expanded=${String(this.activeHeaderMenu === column.key)}
                        type="button"
                      >⋯</button>
                                            ${this.activeHeaderMenu === column.key
            ? this.columnChooserOpen
                ? html `
                              <div id=${this.getHeaderMenuId(column.key)} class="header-menu column-chooser-menu ${columnIndex === 0 ? 'header-menu-right' : ''}" role="dialog" aria-label="Columns" @click=${(event) => event.stopPropagation()}>
                                <button class="column-chooser-close" type="button" aria-label="Close columns" @click=${() => this.closeColumnChooser(true)}>×</button>
                                ${this.getResolvedColumns().map((column) => html `
                                  <label>
                                    <input
                                      type="checkbox"
                                      .checked=${this.isColumnVisible(column.key)}
                                      @change=${(event) => this.setColumnVisible(column.key, event.target.checked)}
                                    />
                                    ${column.header ?? column.key}
                                  </label>
                                `)}
                              </div>
                            `
                : html `
                            <div id=${this.getHeaderMenuId(column.key)} class="header-menu ${columnIndex === 0 ? 'header-menu-right' : ''}" role="dialog" aria-label=${`${column.header ?? column.key} column actions`} @click=${(event) => event.stopPropagation()}>
                              <button type="button" @click=${() => this.toggleQuickSearch()}>
                                ${this.quickSearchVisible ? 'Hide Quick Search' : 'Show Quick Search'}
                              </button>
                              <hr class="header-menu-divider" />
                              <button type="button" @click=${() => this.handleSortAscending(column.key)}>
                                Sort Asc
                              </button>
                              <button type="button" @click=${() => this.handleSortDescending(column.key)}>
                                Sort Desc
                              </button>
                                                            <button type="button" @click=${() => this.handleClearSort()}>
                                                              Clear Sort
                                                            </button>
                                                            <button type="button" @click=${(event) => this.toggleColumnChooser(event)}>
                                                              Columns
                                                            </button>
                              ${(() => {
                    const draft = this.getFilterDraft(column.key);
                    const valueFree = this.isValueFreeFilter(draft.operator);
                    return html `
                                  <div class="header-filter">
                                    <select
                                      aria-label="Filter operator"
                                      @change=${(event) => this.updateFilterDraft(column.key, { operator: event.target.value })}
                                    >
                                      ${FILTER_OPERATORS.map((operator) => html `
                                        <option
                                          value=${operator.value}
                                          ?selected=${operator.value === draft.operator}
                                        >${operator.label}</option>
                                      `)}
                                    </select>
                                    ${valueFree
                        ? ''
                        : html `<input
                                          aria-label="Filter value"
                                          .value=${String(draft.value ?? '')}
                                          @input=${(event) => this.updateFilterDraft(column.key, { value: event.target.value })}
                                        />`}
                                    <div class="header-filter-actions">
                                      <button type="button" @click=${() => this.applyHeaderFilter(column.key)}>
                                        Apply Filter
                                      </button>
                                      <button type="button" @click=${() => this.clearHeaderFilter(column.key)}>
                                        Clear Filter
                                      </button>
                                    </div>
                                  </div>
                                `;
                })()}
                              <hr class="header-menu-divider" />
                              <button type="button" @click=${() => this.handleBestFit(column.key)}>
                                Best Fit
                              </button>
                              <button type="button" @click=${() => this.handleBestFitAllColumns()}>
                                Best Fit All Columns
                              </button>
                            </div>
                          `
            : ''}
                    </div>
                    <span
                      class="resize-handle"
                      aria-hidden="true"
                      @pointerdown=${(event) => this.startColumnResize(event, column)}
                    ></span>
                  </div>
                `)}
              <div class="column-spacer" aria-hidden="true"></div>
            </div>
          </div>
          <div class="header-gutter"></div>
        </div>
                ${visibleColumns.length === 0
            ? html `<div class="column-chooser-empty">
              <button type="button" @click=${() => this.toggleColumnChooser()}>Columns</button>
            </div>`
            : ''}
                <div
                    class="viewport"
          role="grid"
          aria-label=${this.ariaLabel || 'Data grid'}
          aria-rowcount=${count + 1}
          aria-colcount=${columns.length + (this.isRowHeaderVisible() ? 1 : 0)}
          aria-activedescendant=${this.activeCell ? this.getGridCellId(this.activeCell.rowIndex, this.activeCell.columnIndex) : undefined}
          aria-describedby=${`${this.gridId}-description`}
          aria-owns=${this.getHeaderRowId()}
          style=${`--grid-height: ${this.height}px;`}
          tabindex="0"
          @scroll=${this.handleScroll}
          @focus=${this.handleViewportFocus}

          @keydown=${this.handleKeyDown}
          @click=${() => this.closeHeaderMenu()}

        >
          <div style=${`height: ${displayTotal}px;`}>
            <div
              class="content"
              style=${`--offset-top: ${displayOffsetTop}px; padding-bottom: ${displayBottomPadding}px;`}
            >
              ${rows.map((row, index) => {
            const rowIndex = range.startIndex + index;
            const height = this.getRowHeight(rowIndex);
            return html `
                                    <div
                    class=${this.getRowClass(rowIndex)}
                    role="row"
                    aria-rowindex=${rowIndex + 2}
                    aria-selected=${this.isRowSelectionMode() ? String(this.engine.isRowSelected(rowIndex)) : undefined}
                    style=${`height: ${height}px;`}
                    @mousedown=${this.handleRowMouseDown}
                    @click=${(event) => this.handleRowClick(event, rowIndex)}
                  >
                    ${this.renderRowHeader(rowIndex)}
                    <div class="column-spacer" aria-hidden="true"></div>
                    ${visibleColumns.map((column) => this.renderCell(column, row, rowIndex))}
                    <div class="column-spacer" aria-hidden="true"></div>
                  </div>
                `;
        })}
            </div>
          </div>
        </div>
        ${pagination.enabled
            ? html `
              <div class="pagination" role="navigation" aria-label="Pagination">
                <span>${pagination.totalRows} rows</span>
                <label>
                  Rows per page
                  <select
                    aria-label="Rows per page"
                    @change=${(event) => this.setPageSize(Number(event.target.value))}
                  >
                    ${pageSizeOptions.map((pageSize) => html `
                      <option value=${pageSize} ?selected=${pageSize === pagination.pageSize}>
                        ${pageSize}
                      </option>
                    `)}
                  </select>
                </label>
                <span>Page ${pagination.pageCount === 0 ? 0 : pagination.pageIndex + 1} of ${pagination.pageCount}</span>
                <button
                  type="button"
                  ?disabled=${pagination.pageIndex === 0}
                  @click=${() => this.setPage(pagination.pageIndex - 1)}
                >Previous</button>
                <button
                  type="button"
                  ?disabled=${pagination.pageCount === 0 || pagination.pageIndex >= pagination.pageCount - 1}
                  @click=${() => this.setPage(pagination.pageIndex + 1)}
                >Next</button>
              </div>
            `
            : ''}
      </div>
    `;
    }
}
if (!customElements.get('yc-grid')) {
    customElements.define('yc-grid', DataGrid);
}
//# sourceMappingURL=DataGrid.js.map