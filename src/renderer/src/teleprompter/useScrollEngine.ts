import { useEffect, useRef, useState } from 'react'
import type { PlaybackState, TeleprompterSettings } from '../../../shared/types'

export interface ScrollEngineResult {
  viewportRef: React.RefObject<HTMLDivElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
  /** Index of the script line currently at the reading guide. */
  activeLine: number
}

export interface FollowControl {
  /** Follow mode actually engaged (setting on AND ASR pipeline live). */
  enabled: boolean
  /** Target scroll offset in px driven by speech alignment; null = hold. */
  targetRef: React.RefObject<number | null>
}

const GUIDE_RATIO = 0.35
const ACTIVE_LINE_PUBLISH_MS = 100
/** Spring stiffness for follow mode (higher = snappier lock onto the voice). */
const FOLLOW_SPRING_PER_SECOND = 5

/**
 * rAF-driven scroll engine. The offset lives in a ref and is applied as a
 * compositor-friendly transform — no React re-render per frame. The active
 * line is published at ~10 Hz for highlighting.
 *
 * Constant-speed mode: offset advances at playback.speed px/s.
 * Follow mode: offset springs toward the speech-aligned target; when the
 * aligner reports nothing (silence / off-script), the text holds still.
 */
export function useScrollEngine(
  playback: PlaybackState,
  settings: TeleprompterSettings,
  follow: FollowControl,
): ScrollEngineResult {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const [activeLine, setActiveLine] = useState(0)
  const followRef = useRef(follow)
  followRef.current = follow

  const maxOffset = (): number => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return 0
    return Math.max(0, content.scrollHeight - viewport.clientHeight)
  }

  const applyOffset = (offset: number): void => {
    const content = contentRef.current
    if (content) content.style.transform = `translate3d(0, ${-offset}px, 0)`
  }

  const publishActiveLine = (offset: number): void => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return
    const guideY = offset + viewport.clientHeight * GUIDE_RATIO
    const children = content.children
    let index = 0
    for (let i = 0; i < children.length; i += 1) {
      const el = children[i] as HTMLElement
      if (el.offsetTop <= guideY) index = i
      else break
    }
    setActiveLine(index)
  }

  // Reset scroll whenever the session epoch changes (start / reset command).
  useEffect(() => {
    offsetRef.current = 0
    follow.targetRef.current = null
    applyOffset(0)
    publishActiveLine(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.epoch])

  // Main scroll loop while playing.
  useEffect(() => {
    if (playback.status !== 'playing') return
    let raf = 0
    let last = performance.now()
    let lastPublish = 0
    const tick = (now: number): void => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const max = maxOffset()

      let next = offsetRef.current
      const target = followRef.current.enabled ? followRef.current.targetRef.current : null
      if (followRef.current.enabled) {
        if (target !== null) {
          const step = Math.min(1, FOLLOW_SPRING_PER_SECOND * dt)
          next = Math.min(Math.max(0, next + (target - next) * step), max)
        }
        // No target: hold still (speaker silent or off-script).
      } else {
        next = Math.min(next + playback.speed * dt, max)
      }

      offsetRef.current = next
      applyOffset(next)
      if (now - lastPublish > ACTIVE_LINE_PUBLISH_MS) {
        lastPublish = now
        publishActiveLine(next)
      }
      // Constant-speed mode pauses at the end; follow mode just rests there.
      if (!followRef.current.enabled && next >= max && max > 0) {
        window.tp.playback.command({ type: 'pause' })
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.status, playback.speed, follow.enabled, settings.fontSize, settings.lineHeight, settings.letterSpacing])

  // Manual wheel nudge (works while paused to find your place).
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      const next = Math.min(Math.max(0, offsetRef.current + event.deltaY), maxOffset())
      offsetRef.current = next
      applyOffset(next)
      publishActiveLine(next)
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { viewportRef, contentRef, activeLine }
}
