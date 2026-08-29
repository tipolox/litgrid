function normalizeQuery(query: string) {
  return query.trim().toLocaleLowerCase()
}

function matchesValue(value: unknown, query: string) {
  return (
    (typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint') &&
    String(value).toLocaleLowerCase().includes(query)
  )
}

function matchesRow(row: unknown, query: string) {
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    return Object.values(row as Record<string, unknown>).some((value) => matchesValue(value, query))
  }

  return matchesValue(row, query)
}

export function applyQuickSearch(data: unknown[], query: string) {
  const normalizedQuery = normalizeQuery(query)

  if (!normalizedQuery) {
    return data.slice()
  }

  return data.filter((row) => matchesRow(row, normalizedQuery))
}
