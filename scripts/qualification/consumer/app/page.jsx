'use client'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
const Grid = dynamic(() => import('@tipolox/litgrid-react').then(m => m.DataGrid), { ssr: false })
const query = { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 0, pageSize: 20 }
const rows = scope => [{ id: 'unit-a', name: `${scope} Alpha`, amount: '9007199254740993.01' }, { id: 'unit-b', name: `${scope} Beta`, amount: '-2.00' }]
const initial = scope => ({ requestId: 1, query, rows: rows(scope), total: { kind: 'known', totalRows: 352 } })
const columns = [{ key: 'name', header: 'Property' }, { key: 'amount', header: 'Amount', sortable: false, filterable: false }]
export default function Page() {
  const ref = useRef(null)
  const active = useRef({ epoch: 0, id: 1, abort: null })
  const [scope, setScope] = useState('account-a/site-a')
  const [state, setState] = useState(() => initial(scope))
  const [mounted, setMounted] = useState(true)
  const [render, setRender] = useState(0)
  const [calls, setCalls] = useState([])
  const config = useMemo(() => ({ queryMode: 'external', selection: { mode: 'multi-row', rowKey: 'id', scopeKey: scope, checkboxes: true } }), [scope])
  const onQuery = useCallback(event => {
    active.current.abort?.abort()
    const abort = new AbortController()
    const epoch = active.current.epoch
    active.current = { epoch, id: event.requestId, abort }
    setCalls(c => [...c, { id: event.requestId, search: event.query.search, scope }])
    setState(s => ({ ...s, requestId: event.requestId, query: event.query, loading: true, error: undefined }))
    // A deliberately uncancelled transport models an already-delivered response.
    setTimeout(() => {
      if (abort.signal.aborted || active.current.epoch !== epoch || active.current.id !== event.requestId) return
      const error = event.query.search === 'error'
      setState({ requestId: event.requestId, query: event.query, rows: error || event.query.search === 'empty' ? [] : rows(scope).map(r => ({ ...r, name: `${scope} ${event.query.search || 'page'} ${r.id}` })), total: { kind: 'known', totalRows: event.query.search === 'empty' ? 0 : 352 }, error: error ? 'Fictional service unavailable' : undefined, loading: false })
    }, event.query.search === 'slow' ? 350 : 30)
  }, [scope])
  useEffect(() => {
    window.qualification = { ref, calls, state, scope, render, switchScope(next) { active.current.abort?.abort(); active.current.epoch++; setScope(next); setState(s => ({ ...initial(next), requestId: Math.max(s.requestId + 2, active.current.epoch * 10000) })) } }
  })
  useEffect(() => () => { active.current.abort?.abort(); active.current.epoch++ }, [])
  return <main><h1>Fictional property qualification</h1>
    <button onClick={() => setRender(n => n + 1)}>Rerender</button>
    <button onClick={() => { active.current.abort?.abort(); active.current.epoch++; setMounted(v => !v) }}>Toggle grid</button>
    <output aria-label="Render count">{render}</output>
    {mounted && <Grid ref={ref} data={[]} columns={columns} config={config} externalState={state} onQueryChange={onQuery} quickSearchDebounceMs={50} ariaLabel="Fictional properties" ariaDescription="Authorized synthetic test rows" height={360} />}
  </main>
}
