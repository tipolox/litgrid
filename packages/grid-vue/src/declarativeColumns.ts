import { Comment, Fragment, Text, isVNode, type VNodeChild } from 'vue'
import type { GridColumn } from '@tipolox/litgrid-web'
import { LitGridColumn } from './LitGridColumn.js'

const metadata = ['header', 'width', 'hidden', 'sortable', 'filterable', 'accessor', 'render'] as const

/** Read only public VNode structure. Never execute component render/setup functions. */
export function readDeclarativeColumns(nodes: VNodeChild[]): GridColumn[] {
  const columns: GridColumn[] = []
  const keys = new Set<string>()
  const visit = (nodes: VNodeChild[]) => {
    for (const node of nodes) {
      if (node == null || typeof node === 'boolean' || (typeof node === 'string' && !node.trim())) continue
      if (Array.isArray(node)) { visit(node); continue }
      if (!isVNode(node)) throw new Error('DataGrid default slot accepts only direct LitGridColumn declarations and fragments.')
      if (node.type === Comment || (node.type === Text && !String(node.children ?? '').trim())) continue
      if (node.type === Fragment) {
        if (node.children != null) visit(Array.isArray(node.children) ? node.children as VNodeChild[] : [node.children as VNodeChild])
        continue
      }
      if (node.type !== LitGridColumn) {
        throw new Error('DataGrid default slot accepts only direct LitGridColumn declarations and fragments.')
      }
      if (node.children != null) throw new Error('LitGridColumn accepts metadata only; column and cell slots are not supported.')
      const props = node.props ?? {}
      let column: GridColumn
      if (props.column !== undefined) {
        if (props.field !== undefined || metadata.some(key => props[key] !== undefined)) {
          throw new Error('LitGridColumn accepts either column or field with metadata, not both.')
        }
        column = { ...props.column }
      } else {
        column = { key: props.field }
        for (const key of metadata) {
          const value = props[key]
          if (value !== undefined) {
            // Slot markers are never mounted, so normalize Vue's bare Boolean attributes here.
            Reflect.set(column, key, ['hidden', 'sortable', 'filterable'].includes(key) && (value === '' || value === key) ? true : value)
          }
        }
      }
      if (typeof column.key !== 'string' || !column.key.trim()) {
        throw new Error('LitGridColumn requires a nonempty field or column.key.')
      }
      if (keys.has(column.key)) throw new Error(`Duplicate LitGridColumn key: ${column.key}`)
      keys.add(column.key)
      columns.push(column)
    }
  }
  visit(nodes)
  return columns
}
