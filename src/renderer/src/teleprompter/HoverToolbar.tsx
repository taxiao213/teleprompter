import { AudioLines, Pause, Play, RotateCcw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/appStore'

/**
 * Floating controls revealed on hover: play/pause + reset + close, plus a
 * follow-mode indicator. The bar is the window's drag region; buttons opt
 * out via .no-drag.
 */
export function HoverToolbar(props: { followActive: boolean }): React.JSX.Element {
  const { t } = useTranslation()
  const status = useAppStore((s) => s.playback.status)

  return (
    <div className="drag-region absolute left-0 right-0 top-0 z-50 flex h-9 items-center justify-between px-2 opacity-0 transition-opacity duration-150 hover:opacity-100">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={status === 'playing' ? t('playback.pause') : t('playback.play')}
          className="no-drag rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() => window.tp.playback.command({ type: 'toggle' })}
        >
          {status === 'playing' ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          type="button"
          aria-label={t('playback.reset')}
          className="no-drag rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() => window.tp.playback.command({ type: 'reset' })}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        {props.followActive && (
          <span
            title={t('settings.followMode')}
            className="no-drag flex items-center gap-1 rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-medium text-lime-300"
          >
            <AudioLines size={11} />
            {t('settings.following')}
          </span>
        )}
        <button
          type="button"
          aria-label={t('playback.stop')}
          className="no-drag rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() => window.tp.playback.command({ type: 'stop' })}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
