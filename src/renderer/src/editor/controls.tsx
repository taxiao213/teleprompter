import * as SliderPrimitive from '@radix-ui/react-slider'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

export function Section(props: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        {props.title}
      </h3>
      <div className="space-y-3">{props.children}</div>
    </section>
  )
}

export function SliderField(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (value: number) => string
  onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs text-zinc-400">{props.label}</label>
        <span className="text-xs tabular-nums text-zinc-300">
          {props.format ? props.format(props.value) : props.value}
        </span>
      </div>
      <SliderPrimitive.Root
        className="relative flex h-5 touch-none select-none items-center"
        value={[props.value]}
        min={props.min}
        max={props.max}
        step={props.step}
        onValueChange={([v]) => props.onChange(v)}
      >
        <SliderPrimitive.Track className="relative h-1 flex-1 rounded-full bg-zinc-800">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-lime-400" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={props.label}
          className="block h-3.5 w-3.5 rounded-full bg-lime-300 shadow focus:outline-none focus:ring-2 focus:ring-lime-400/50"
        />
      </SliderPrimitive.Root>
    </div>
  )
}

export function SwitchField(props: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <label className="text-xs text-zinc-300">{props.label}</label>
        {props.hint && <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{props.hint}</p>}
      </div>
      <SwitchPrimitive.Root
        checked={props.checked}
        onCheckedChange={props.onChange}
        aria-label={props.label}
        className="relative h-5 w-9 shrink-0 rounded-full bg-zinc-700 transition-colors data-[state=checked]:bg-lime-400"
      >
        <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[18px]" />
      </SwitchPrimitive.Root>
    </div>
  )
}

export function ColorField(props: {
  label: string
  value: string
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-zinc-400">{props.label}</label>
      <input
        type="color"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-label={props.label}
        className="h-6 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
      />
    </div>
  )
}

export function SelectField(props: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-zinc-400">{props.label}</label>
      <SelectPrimitive.Root value={props.value} onValueChange={props.onChange}>
        <SelectPrimitive.Trigger
          aria-label={props.label}
          className="flex h-7 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-lime-400/50"
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon>
            <ChevronDown size={12} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="z-50 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
            <SelectPrimitive.Viewport className="p-1">
              {props.options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none data-[highlighted]:bg-zinc-800"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check size={12} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  )
}

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta'])

/** Records the next keypress as an Electron accelerator string. */
export function ShortcutField(props: {
  label: string
  value: string
  onChange: (accelerator: string) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const [listening, setListening] = useState(false)

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (!listening) return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Escape') {
      setListening(false)
      return
    }
    if (MODIFIER_KEYS.has(event.key)) return

    const parts: string[] = []
    if (event.ctrlKey || event.metaKey) parts.push('CommandOrControl')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')
    parts.push(normalizeKey(event.key))
    props.onChange(parts.join('+'))
    setListening(false)
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-zinc-400">{props.label}</label>
      <button
        type="button"
        onClick={() => setListening(true)}
        onKeyDown={onKeyDown}
        onBlur={() => setListening(false)}
        className={clsx(
          'h-7 min-w-20 rounded-md border px-2 text-xs tabular-nums focus:outline-none',
          listening
            ? 'border-lime-400 bg-lime-400/10 text-lime-300'
            : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500',
        )}
      >
        {listening ? t('settings.pressKey') : props.value}
      </button>
    </div>
  )
}

function normalizeKey(key: string): string {
  if (key === ' ') return 'Space'
  if (key.startsWith('Arrow')) return key.slice('Arrow'.length)
  if (key.length === 1) return key.toUpperCase()
  return key
}
