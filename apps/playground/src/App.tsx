import { useEffect, useState } from 'react'
import type { GridTheme } from '@tipolox/litgrid-web'
import { CheckboxSelectionDemo } from './CheckboxSelectionDemo'
import { ColumnStateDemo } from './ColumnStateDemo'
import { CustomRendererDemo } from './CustomRendererDemo'
import { ExamplesDemo } from './ExamplesDemo'
import { LargeDatasetDemo } from './LargeDatasetDemo'
import { PaginationDemo } from './PaginationDemo'
import { SmallDatasetDemo } from './SmallDatasetDemo'

function getPage() {
  if (window.location.hash === '#examples') return 'examples'
  if (window.location.hash === '#large-dataset' || window.location.hash === '#virtualization') return 'large-dataset'
  if (window.location.hash === '#pagination') return 'pagination'
  if (window.location.hash === '#checkbox-selection') return 'checkbox-selection'
  if (window.location.hash === '#column-state') return 'column-state'
  if (window.location.hash === '#custom-renderers') return 'custom-renderers'
  return 'small-dataset'
}

export default function App() {
  const [page, setPage] = useState(getPage)
  const [theme, setTheme] = useState<GridTheme>('light')

  useEffect(() => {
    const handleHashChange = () => setPage(getPage())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <main className="playground" data-theme={theme}>
      <header className="playground-header">
        <div>
          <p className="eyebrow">LitGrid playground</p>
          <h2>
            {page === 'examples'
              ? 'Examples'
              : page === 'small-dataset'
              ? 'Small dataset'
              : page === 'pagination'
                ? 'Client-side pagination'
                : page === 'checkbox-selection'
                  ? 'Checkbox selection'
                  : page === 'column-state'
                    ? 'Saved column preferences'
                    : page === 'custom-renderers'
                      ? 'Custom renderers'
                      : 'Large dataset'}
          </h2>
        </div>
        <div className="playground-actions">
          <nav aria-label="Playground examples">
            <a className={page === 'examples' ? 'active' : ''} href="#examples">Examples</a>
            <a className={page === 'small-dataset' ? 'active' : ''} href="#small-dataset">Small dataset</a>
            <a className={page === 'large-dataset' ? 'active' : ''} href="#large-dataset">Large dataset</a>
            <a className={page === 'pagination' ? 'active' : ''} href="#pagination">Pagination</a>
            <a className={page === 'checkbox-selection' ? 'active' : ''} href="#checkbox-selection">Checkbox selection</a>
            <a className={page === 'column-state' ? 'active' : ''} href="#column-state">Saved preferences</a>
            <a className={page === 'custom-renderers' ? 'active' : ''} href="#custom-renderers">Custom renderers</a>
          </nav>
          <div className="theme-toggle" aria-label="Grid theme">
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
            >
              Light
            </button>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
            >
              Dark
            </button>
          </div>
        </div>
      </header>

      {page === 'examples' ? <ExamplesDemo /> : null}
      {page === 'small-dataset' ? <SmallDatasetDemo theme={theme} /> : null}
      {page === 'pagination' ? <PaginationDemo theme={theme} /> : null}
      {page === 'checkbox-selection' ? <CheckboxSelectionDemo theme={theme} /> : null}
      {page === 'column-state' ? <ColumnStateDemo theme={theme} /> : null}
      {page === 'custom-renderers' ? <CustomRendererDemo theme={theme} /> : null}
      {page === 'large-dataset' ? <LargeDatasetDemo theme={theme} /> : null}
    </main>
  )
}
