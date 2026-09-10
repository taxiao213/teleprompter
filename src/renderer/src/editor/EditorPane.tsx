import { useTranslation } from 'react-i18next'
import type { Script } from '../../../shared/types'

export interface ScriptDraft {
  title: string
  content: string
}

export function EditorPane(props: {
  script: Script | null
  draft: ScriptDraft
  onChange: (draft: ScriptDraft) => void
}): React.JSX.Element {
  const { t } = useTranslation()

  if (!props.script) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
        {t('editor.empty')}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <input
        value={props.draft.title}
        onChange={(e) => props.onChange({ ...props.draft, title: e.target.value })}
        placeholder={t('editor.titlePlaceholder')}
        className="border-b border-zinc-800/80 bg-transparent px-6 py-4 text-lg font-semibold text-zinc-100 placeholder-zinc-600 focus:outline-none"
      />
      <textarea
        value={props.draft.content}
        onChange={(e) => props.onChange({ ...props.draft, content: e.target.value })}
        placeholder={t('editor.contentPlaceholder')}
        spellCheck={false}
        className="flex-1 resize-none bg-transparent px-6 py-4 text-[15px] leading-7 text-zinc-200 placeholder-zinc-600 focus:outline-none"
      />
      <div className="border-t border-zinc-800/80 px-6 py-1.5 text-right text-[11px] tabular-nums text-zinc-600">
        {t('editor.chars', { count: props.draft.content.length })}
      </div>
    </div>
  )
}
