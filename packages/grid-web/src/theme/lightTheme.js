import { css } from 'lit';
/**
 * Default semantic color tokens for the Community Edition grid.
 * Consumers can override these custom properties on `yc-grid`.
 */
export const lightThemeStyles = css `
  :host,
  :host([theme='light']) {
    --litgrid-color-text: #111827;
    --litgrid-color-text-strong: #0f172a;
    --litgrid-color-text-muted: #475569;
    --litgrid-color-text-subtle: #64748b;
    --litgrid-color-text-header: #334155;
    --litgrid-color-surface: #ffffff;
    --litgrid-color-surface-subtle: #f8fafc;
    --litgrid-color-surface-hover: #f1f5f9;
    --litgrid-color-row-start: rgba(249, 250, 251, 0.9);
    --litgrid-color-row-end: rgba(255, 255, 255, 0.95);
    --litgrid-color-border: #cbd5e1;
    --litgrid-color-border-strong: #d1d5db;
    --litgrid-color-border-subtle: #e2e8f0;
    --litgrid-color-cell-border: #eef2f7;
    --litgrid-color-row-border: #e5e7eb;
    --litgrid-color-accent: #2563eb;
    --litgrid-color-accent-soft: #dbeafe;
    --litgrid-color-accent-selected: #bfdbfe;
    --litgrid-color-accent-text: #1e3a8a;
    --litgrid-color-resize-indicator: #94a3b8;
    --litgrid-color-control-hover: rgba(148, 163, 184, 0.15);
    --litgrid-shadow-shell: 0 12px 32px rgba(15, 23, 42, 0.08);
    --litgrid-shadow-menu: 0 12px 24px rgba(15, 23, 42, 0.12);
    --litgrid-shadow-dialog: 0 8px 20px rgba(15, 23, 42, 0.15);
  }
`;
//# sourceMappingURL=lightTheme.js.map