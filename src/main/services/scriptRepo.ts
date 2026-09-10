import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Script } from '../../shared/types'

const FALLBACK_TITLE = 'Untitled'

function scriptsDir(): string {
  return join(app.getPath('userData'), 'scripts')
}

async function ensureDir(): Promise<string> {
  const dir = scriptsDir()
  await mkdir(dir, { recursive: true })
  return dir
}

function isScript(value: unknown): value is Script {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.title === 'string' &&
    typeof s.content === 'string' &&
    typeof s.createdAt === 'number' &&
    typeof s.updatedAt === 'number' &&
    Number.isFinite(s.createdAt) &&
    Number.isFinite(s.updatedAt)
  )
}

export async function listScripts(): Promise<Script[]> {
  const dir = await ensureDir()
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'))
  const scripts: Script[] = []
  for (const file of files) {
    try {
      const raw = await readFile(join(dir, file), 'utf8')
      const parsed: unknown = JSON.parse(raw)
      if (isScript(parsed)) scripts.push(parsed)
    } catch {
      // Skip corrupted files instead of failing the whole list.
    }
  }
  return scripts.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getScript(id: string): Promise<Script | null> {
  const all = await listScripts()
  return all.find((s) => s.id === id) ?? null
}

export async function createScript(input?: Partial<Pick<Script, 'title' | 'content'>>): Promise<Script> {
  const now = Date.now()
  const script: Script = {
    id: randomUUID(),
    title: input?.title?.trim() || FALLBACK_TITLE,
    content: input?.content ?? '',
    createdAt: now,
    updatedAt: now,
  }
  await persist(script)
  return script
}

export async function updateScript(
  id: string,
  patch: Partial<Pick<Script, 'title' | 'content'>>,
): Promise<Script | null> {
  const existing = await getScript(id)
  if (!existing) return null
  const next: Script = { ...existing, ...patch, id, updatedAt: Date.now() }
  await persist(next)
  return next
}

export async function deleteScript(id: string): Promise<boolean> {
  const dir = await ensureDir()
  try {
    await rm(join(dir, `${id}.json`))
    return true
  } catch {
    return false
  }
}

async function persist(script: Script): Promise<void> {
  const dir = await ensureDir()
  await writeFile(join(dir, `${script.id}.json`), JSON.stringify(script, null, 2), 'utf8')
}
