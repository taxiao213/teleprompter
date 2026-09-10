import { FileText, FileUp, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import type { Script } from '../../../shared/types'

export function Sidebar(props: {
  scripts: Script[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onImport: () => void
  onDelete: (script: Script) => void
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          {t('sidebar.scripts')}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={props.onImport}
            aria-label={t('sidebar.import')}
            title={t('sidebar.importHint')}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-lime-300"
          >
            <FileUp size={14} />
          </button>
          <button
            type="button"
            onClick={props.onCreate}
            aria-label={t('sidebar.new')}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-lime-300"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-2">
        {props.scripts.length === 0 && (
          <p className="whitespace-pre-line px-2 pt-8 text-center text-xs leading-relaxed text-zinc-600">
            {t('sidebar.empty')}
          </p>
        )}
        {props.scripts.map((script) => (
          <div
            key={script.id}
            className={clsx(
              'group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2',
              script.id === props.selectedId
                ? 'bg-zinc-800/80 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
            )}
            onClick={() => props.onSelect(script.id)}
          >
            <FileText size={14} className="shrink-0 opacity-60" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{script.title}</div>
              <div className="text-[10px] tabular-nums text-zinc-600">
                {t('editor.chars', { count: script.content.length })}
              </div>
            </div>
            <button
              type="button"
              aria-label={t('common.delete')}
              className="hidden shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 group-hover:block"
              onClick={(event) => {
                event.stopPropagation()
                props.onDelete(script)
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
