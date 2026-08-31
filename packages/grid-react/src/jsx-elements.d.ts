import type { DetailedHTMLProps, HTMLAttributes } from 'react'
import type { DataGridElement } from '@tipolox/litgrid-web'

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'yc-grid': DetailedHTMLProps<HTMLAttributes<DataGridElement>, DataGridElement>
    }
  }
}
