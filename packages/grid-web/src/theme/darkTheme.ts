import { css } from 'lit'

/**
 * Dark semantic color tokens for the Community Edition grid.
 * Consumers can override these custom properties on `yc-grid`.
 */
export const darkThemeStyles = css`
  :host([theme='dark']) {
    --litgrid-color-text: #e2e8f0;
    --litgrid-color-text-strong: #f8fafc;
    --litgrid-color-text-muted: #cbd5e1;
    --litgrid-color-text-subtle: #94a3b8;
    --litgrid-color-text-header: #e2e8f0;
    --litgrid-color-surface: #0f172a;
    --litgrid-color-surface-subtle: #1e293b;
    --litgrid-color-surface-hover: #334155;
    --litgrid-color-row-start: rgba(30, 41, 59, 0.9);
    --litgrid-color-row-end: rgba(15, 23, 42, 0.95);
    --litgrid-color-border: #475569;
    --litgrid-color-border-strong: #64748b;
    --litgrid-color-border-subtle: #334155;
    --litgrid-color-cell-border: #1e293b;
    --litgrid-color-row-border: #334155;
    --litgrid-color-accent: #60a5fa;
    --litgrid-color-accent-soft: #1e3a5f;
    --litgrid-color-accent-selected: #1d4ed8;
    --litgrid-color-accent-text: #dbeafe;
    --litgrid-color-resize-indicator: #94a3b8;
    --litgrid-color-control-hover: rgba(148, 163, 184, 0.2);
    --litgrid-shadow-shell: 0 12px 32px rgba(0, 0, 0, 0.35);
    --litgrid-shadow-menu: 0 12px 24px rgba(0, 0, 0, 0.45);
    --litgrid-shadow-dialog: 0 8px 20px rgba(0, 0, 0, 0.5);
  }
`
