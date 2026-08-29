const examples = [
  {
    href: '#small-dataset',
    title: 'Production order grid',
    description: 'Single-row selection, sorting, column filters, and Quick Search in a compact operational table.'
  },
  {
    href: '#pagination',
    title: 'Paginated orders',
    description: 'Client-side pagination that remains correct as search, sorting, and filters change the displayed data.'
  },
  {
    href: '#checkbox-selection',
    title: 'Selectable tasks',
    description: 'Multi-row checkbox selection with current-page select-all and indeterminate state handling.'
  },
  {
    href: '#column-state',
    title: 'Saved column preferences',
    description: 'React column-state callbacks plus browser-local persistence for widths, visibility, and ordering.'
  },
  {
    href: '#custom-renderers',
    title: 'Custom cells',
    description: 'String and Lit-template renderers for badges, progress, and icons while preserving data operations.'
  },
  {
    href: '#large-dataset',
    title: 'Large dataset',
    description: 'A one-million-row virtualized grid for evaluating scrolling and column virtualization behavior.'
  }
]

export function ExamplesDemo() {
  return (
    <section className="demo-section examples-section">
      <p className="demo-description">
        Start with a focused, working scenario. Each example uses the public React API and maps to a copyable pattern in the Examples guide.
      </p>
      <div className="example-grid">
        {examples.map((example) => (
          <a className="example-card" href={example.href} key={example.href}>
            <h3>{example.title}</h3>
            <p>{example.description}</p>
            <span>Open example →</span>
          </a>
        ))}
      </div>
    </section>
  )
}
