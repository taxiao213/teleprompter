import { useEffect, useMemo, useRef, useState } from 'react'
import { SELFTEST_PROBE_COLOR } from '../../../shared/defaults'
import { useAppStore } from '../stores/appStore'
import { AudioCapture } from './audioCapture'
import { FollowAligner } from './FollowAligner'
import { HoverToolbar } from './HoverToolbar'
import { ResizeHandles } from './ResizeHandles'
import { useScrollEngine } from './useScrollEngine'

const GUIDE_RATIO = 0.35

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16) || 0
  const g = parseInt(value.slice(2, 4), 16) || 0
  const b = parseInt(value.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function App(): React.JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const playback = useAppStore((s) => s.playback)
  const script = useAppStore((s) => s.script)
  const asr = useAppStore((s) => s.asr)
  const [probeActive, setProbeActive] = useState(false)
  const [micLive, setMicLive] = useState(false)

  const alignerRef = useRef(new FollowAligner())
  const followLineRef = useRef<number | null>(null)
  const followTargetRef = useRef<number | null>(null)
  const captureRef = useRef<AudioCapture | null>(null)

  // Stealth self-test probe: paint the whole window solid magenta so the main
  // process can check whether the color leaks into a screen capture.
  useEffect(() => {
    const offPrepare = window.tp.selftest.onPrepare(() => setProbeActive(true))
    const offDone = window.tp.selftest.onDone(() => setProbeActive(false))
    return () => {
      offPrepare()
      offDone()
    }
  }, [])

  const lines = useMemo(() => (script?.content ?? '').split('\n'), [script?.content])

  // Rebuild the aligner whenever the script changes.
  useEffect(() => {
    alignerRef.current.setScript(lines)
    followLineRef.current = null
    followTargetRef.current = null
  }, [lines])

  // New session / reset: aligner goes back to the top.
  useEffect(() => {
    alignerRef.current.reset()
    followLineRef.current = null
    followTargetRef.current = null
  }, [playback.epoch])

  // ASR results drive the follow-mode target line.
  useEffect(() => {
    return window.tp.asr.onResult((result) => {
      const line = alignerRef.current.feed(result.text, result.isEndpoint)
      if (line !== null) followLineRef.current = line
    })
  }, [])

  const followActive =
    settings.followMode && playback.status !== 'idle' && asr.state === 'ready' && micLive

  const { viewportRef, contentRef, activeLine } = useScrollEngine(playback, settings, {
    enabled: followActive,
    targetRef: followTargetRef,
  })

  // Mic capture lifecycle: run only while prompting with a ready ASR engine.
  useEffect(() => {
    const shouldCapture = settings.followMode && playback.status !== 'idle' && asr.state === 'ready'
    if (shouldCapture && !captureRef.current) {
      const capture = new AudioCapture()
      captureRef.current = capture
      capture
        .start((pcm) => window.tp.asr.feedPcm(pcm))
        .then(() => setMicLive(true))
        .catch((error: unknown) => {
          // Mic denied/unavailable: follow degrades to constant speed, but
          // never swallow the reason — invisible failures killed follow once.
          console.error('[follow] mic capture failed:', error)
          captureRef.current = null
          setMicLive(false)
        })
    } else if (!shouldCapture && captureRef.current) {
      const capture = captureRef.current
      captureRef.current = null
      setMicLive(false)
      void capture.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.followMode, playback.status, asr.state])

  // Translate the follow target line into a pixel offset for the engine.
  useEffect(() => {
    if (!followActive) return
    let raf = 0
    const update = (): void => {
      const line = followLineRef.current
      const viewport = viewportRef.current
      const content = contentRef.current
      if (line !== null && viewport && content) {
        const el = content.children[line] as HTMLElement | undefined
        if (el) {
          followTargetRef.current = el.offsetTop - viewport.clientHeight * GUIDE_RATIO
        }
      }
      raf = requestAnimationFrame(update)
    }
    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followActive])

  if (probeActive) {
    return <div className="h-full w-full" style={{ backgroundColor: SELFTEST_PROBE_COLOR }} />
  }

  const mirrorTransform = [
    settings.mirrorHorizontal ? 'scaleX(-1)' : '',
    settings.mirrorVertical ? 'scaleY(-1)' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const displayLine = activeLine

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ backgroundColor: hexToRgba(settings.backgroundColor, settings.backgroundOpacity) }}
    >
      <HoverToolbar followActive={followActive} />

      {/* Reading guide line */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-30"
        style={{ top: `${GUIDE_RATIO * 100}%` }}
      >
        <div className="mx-3 flex items-center gap-2 opacity-60">
          <div className="h-px flex-1 bg-lime-300/70" />
          <div className="h-1.5 w-1.5 rotate-45 bg-lime-300/70" />
          <div className="h-px flex-1 bg-lime-300/70" />
        </div>
      </div>

      {/* Scrolling content. Mirror transform wraps the translate so both compose. */}
      <div
        ref={viewportRef}
        className="absolute inset-0 overflow-hidden"
        style={{ transform: mirrorTransform || undefined }}
      >
        <div
          ref={contentRef}
          className="will-change-transform"
          style={{
            paddingTop: `${GUIDE_RATIO * 100}vh`,
            paddingBottom: `${(1 - GUIDE_RATIO) * 100}vh`,
            paddingLeft: '1.5rem',
            paddingRight: '1.5rem',
          }}
        >
          {lines.map((line, index) => (
            <div
              key={index}
              style={{
                fontSize: settings.fontSize,
                lineHeight: settings.lineHeight,
                letterSpacing: settings.letterSpacing,
                color: settings.textColor,
                fontFamily: settings.fontFamily,
                textAlign: settings.textAlign,
                opacity: index === displayLine ? 1 : 0.55,
                fontWeight: index === displayLine ? 600 : 400,
                transition: 'opacity 150ms ease',
                overflowWrap: 'break-word',
              }}
            >
              {line === '' ? ' ' : line}
            </div>
          ))}
        </div>
      </div>

      <ResizeHandles />
    </div>
  )
}
