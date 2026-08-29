declare module 'react' {
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  export function useRef<T>(initialValue: T): { current: T }
}

declare module 'react/jsx-runtime' {
  export const Fragment: unique symbol
  export function jsx(type: unknown, props: unknown, key?: unknown): unknown
  export function jsxs(type: unknown, props: unknown, key?: unknown): unknown

  export namespace JSX {
    interface Element {}
    interface IntrinsicElements {
      'yc-grid': Record<string, unknown>
    }
  }
}
