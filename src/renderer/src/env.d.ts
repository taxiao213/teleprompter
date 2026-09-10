import type { WindowApi } from '../../preload/api'

declare global {
  interface Window {
    /** Union of both window APIs; at runtime each window exposes its own subset. */
    tp: WindowApi
  }
}

export {}
