import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pause, Play, RotateCcw, Square, Clapperboard } from 'lucide-react'
import clsx from 'clsx'
import type { Script, TeleprompterSettings } from '../../../shared/types'
import { useAppStore } from '../stores/appStore'
import { EditorPane, type ScriptDraft } from './EditorPane'
import { SettingsPanel } from './SettingsPanel'
import { Sidebar } from './Sidebar'

const AUTOSAVE_MS = 600

export default function App(): React.JSX.Element {
  const { t } = useTranslation()
  const settings = useAppStore((s) => s.settings)
  const playback = useAppStore((s) => s.playback)

  const [scripts, setScripts] = useState<Script[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ScriptDraft>({ title: '', content: '' })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Refs mirror selection/draft so the debounced save never acts on stale
  // closures, and switching scripts can flush the pending save first.
  const selectedIdRef = useRef<string | null>(null)
  const draftRef = useRef<ScriptDraft>(draft)
  const dirtyRef = useRef(false)

  const selected = scripts.find((s) => s.id === selectedId) ?? null
  const prompting = playback.status !== 'idle'

  const reload = useCallback(async (): Promise<void> => {
    setScripts(await window.tp.scripts.list())
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const mergeUpdated = useCallback((updated: Script): void => {
    setScripts((list) =>
      list.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) => b.updatedAt - a.updatedAt),
    )
  }, [])

  const flushSave = useCallback(async (): Promise<void> => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const id = selectedIdRef.current
    if (!id || !dirtyRef.current) return
    dirtyRef.current = false
    const updated = await window.tp.scripts.update(id, draftRef.current)
    if (updated) mergeUpdated(updated)
  }, [mergeUpdated])

  // Flush pending edits when the editor unmounts.
  useEffect(() => {
    return () => {
      void flushSave()
    }
  }, [flushSave])

  // Load the selected script into the draft.
  useEffect(() => {
    if (!selected) return
    const loaded: ScriptDraft = { title: selected.title, content: selected.content }
    setDraft(loaded)
    draftRef.current = loaded
    dirtyRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Debounced autosave.
  const onDraftChange = (next: ScriptDraft): void => {
    setDraft(next)
    draftRef.current = next
    if (!selectedIdRef.current) return
    dirtyRef.current = true
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void flushSave()
    }, AUTOSAVE_MS)
  }

  const selectScript = (id: string | null): void => {
    if (id === selectedIdRef.current) return
    void flushSave()
    selectedIdRef.current = id
    setSelectedId(id)
  }

  const createScript = async (): Promise<void> => {
    await flushSave()
    const script = await window.tp.scripts.create()
    setScripts((list) => [script, ...list])
    selectedIdRef.current = script.id
    setSelectedId(script.id)
  }

  const importScripts = async (): Promise<void> => {
    await flushSave()
    const { imported, skipped } = await window.tp.scripts.import()
    if (imported.length > 0) {
      setScripts((list) =>
        [...imported, ...list].sort((a, b) => b.updatedAt - a.updatedAt),
      )
      selectedIdRef.current = imported[0].id
      setSelectedId(imported[0].id)
    }
    if (skipped.length > 0) {
      window.alert(t('sidebar.importSkipped', { files: skipped.join(', ') }))
    }
  }

  const deleteScript = async (script: Script): Promise<void> => {
    if (!window.confirm(t('sidebar.deleteConfirm', { title: script.title }))) return
    if (selectedIdRef.current === script.id) {
      // Discard pending edits for a script that is about to disappear.
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = null
      dirtyRef.current = false
      selectedIdRef.current = null
      setSelectedId(null)
    }
    await window.tp.scripts.delete(script.id)
    setScripts((list) => list.filter((s) => s.id !== script.id))
  }

  const patchSettings = (patch: Partial<TeleprompterSettings>): void => {
    window.tp.settings.patch(patch)
  }

  const canStart = !prompting && selected !== null && draft.content.trim().length > 0

  return (
    <div className="flex h-full flex-col bg-[#0a0a0b] text-zinc-200">
      {/* Header: brand + transport controls */}
      <header className="drag-region flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/80 px-4">
        <div className="flex items-center gap-2.5">
          <Clapperboard size={16} className="text-lime-400" />
          <span className="text-sm font-semibold tracking-wide text-zinc-100">
            {t('app.name')}
          </span>
          <span className="hidden text-[11px] text-zinc-600 sm:inline">{t('app.tagline')}</span>
        </div>

        <div className="no-drag flex items-center gap-2">
          {prompting && (
            <>
              <span
                className={clsx(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
                  playback.status === 'playing'
                    ? 'bg-lime-400/10 text-lime-300'
                    : 'bg-zinc-800 text-zinc-400',
                )}
              >
                {t(`playback.${playback.status}`)} · {playback.speed} px/s
              </span>
              <button
                type="button"
                aria-label={playback.status === 'playing' ? t('playback.pause') : t('playback.play')}
                className="rounded-md p-1.5 text-zinc-300 hover:bg-zinc-800"
                onClick={() => window.tp.playback.command({ type: 'toggle' })}
              >
                {playback.status === 'playing' ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button
                type="button"
                aria-label={t('playback.reset')}
                className="rounded-md p-1.5 text-zinc-300 hover:bg-zinc-800"
                onClick={() => window.tp.playback.command({ type: 'reset' })}
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-200 hover:border-red-400/60 hover:text-red-300"
                onClick={() => window.tp.playback.command({ type: 'stop' })}
              >
                <Square size={12} />
                {t('playback.stop')}
              </button>
            </>
          )}
          {!prompting && (
            <button
              type="button"
              disabled={!canStart}
              title={canStart ? undefined : t('playback.needScript')}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-lime-400 px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() =>
                selected && window.tp.playback.command({ type: 'start', scriptId: selected.id })
              }
            >
              <Play size={13} />
              {t('playback.start')}
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          scripts={scripts}
          selectedId={selectedId}
          onSelect={selectScript}
          onCreate={() => void createScript()}
          onImport={() => void importScripts()}
          onDelete={(script) => void deleteScript(script)}
        />
        <EditorPane script={selected} draft={draft} onChange={onDraftChange} />
        <SettingsPanel settings={settings} onPatch={patchSettings} />
      </div>
    </div>
  )
}
