import { useRef } from 'react'
import type { ResizeEdge } from '../../../shared/types'

const HANDLE_SIZE = 8

const EDGES: Array<{ edge: ResizeEdge; className: string; cursor: string }> = [
  { edge: 'n', className: 'top-0 left-2 right-2 h-2', cursor: 'ns-resize' },
  { edge: 's', className: 'bottom-0 left-2 right-2 h-2', cursor: 'ns-resize' },
  { edge: 'w', className: 'left-0 top-2 bottom-2 w-2', cursor: 'ew-resize' },
  { edge: 'e', className: 'right-0 top-2 bottom-2 w-2', cursor: 'ew-resize' },
  { edge: 'nw', className: 'top-0 left-0 h-3 w-3', cursor: 'nwse-resize' },
  { edge: 'ne', className: 'top-0 right-0 h-3 w-3', cursor: 'nesw-resize' },
  { edge: 'sw', className: 'bottom-0 left-0 h-3 w-3', cursor: 'nesw-resize' },
  { edge: 'se', className: 'bottom-0 right-0 h-3 w-3', cursor: 'nwse-resize' },
]

/**
 * Frameless transparent windows get no native resize affordance on Windows,
 * so we draw our own edge hot-zones and forward deltas to the main process.
 */
export function ResizeHandles(): React.JSX.Element {
  const last = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = (edge: ResizeEdge) => (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    last.current = { x: event.clientX, y: event.clientY }
    const move = (e: PointerEvent): void => {
      if (!last.current) return
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      if (dx === 0 && dy === 0) return
      last.current = { x: e.clientX, y: e.clientY }
      window.tp.windowControls.resize(edge, dx, dy)
    }
    const up = (): void => {
      last.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <>
      {EDGES.map(({ edge, className, cursor }) => (
        <div
          key={edge}
          className={`absolute z-40 ${className}`}
          style={{ cursor, touchAction: 'none' }}
          onPointerDown={onPointerDown(edge)}
        />
      ))}
    </>
  )
}

export const HANDLE_GUTTER = HANDLE_SIZE
