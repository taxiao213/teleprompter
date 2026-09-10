import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

let userDataDir = ''
let sourceDir = ''
const showOpenDialog = vi.fn()

vi.mock('electron', () => ({
  app: { getPath: (_name: string): string => userDataDir },
  dialog: { showOpenDialog: (...args: unknown[]) => showOpenDialog(...args) },
}))

const { importScripts } = await import('./importScripts')
const { listScripts } = await import('./scriptRepo')

beforeAll(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'tp-import-store-'))
  sourceDir = await mkdtemp(join(tmpdir(), 'tp-import-src-'))
})

afterAll(async () => {
  await rm(userDataDir, { recursive: true, force: true })
  await rm(sourceDir, { recursive: true, force: true })
})

describe('importScripts', () => {
  it('returns empty result when the picker is canceled', async () => {
    showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] })
    const result = await importScripts(null)
    expect(result).toEqual({ imported: [], skipped: [] })
  })

  it('imports markdown and txt files using the file name as title', async () => {
    const md = join(sourceDir, '开场白.md')
    const txt = join(sourceDir, '产品介绍.txt')
    await writeFile(md, '# 大家好\n欢迎来到频道', 'utf8')
    await writeFile(txt, '第一行\n第二行', 'utf8')
    showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [md, txt] })

    const result = await importScripts(null)
    expect(result.skipped).toEqual([])
    expect(result.imported).toHaveLength(2)
    expect(result.imported.map((s) => s.title).sort()).toEqual(['产品介绍', '开场白'])
    expect(result.imported.find((s) => s.title === '开场白')?.content).toContain('大家好')

    // Files are persisted in the repo, not just returned.
    const stored = await listScripts()
    for (const script of result.imported) {
      expect(stored.some((s) => s.id === script.id)).toBe(true)
    }
  })

  it('skips empty, oversized, and unreadable files', async () => {
    const empty = join(sourceDir, 'empty.txt')
    const huge = join(sourceDir, 'huge.md')
    const missing = join(sourceDir, 'gone.txt')
    await writeFile(empty, '', 'utf8')
    await writeFile(huge, 'x'.repeat(200_001), 'utf8')
    showOpenDialog.mockResolvedValueOnce({
      canceled: false,
      filePaths: [empty, huge, missing],
    })

    const result = await importScripts(null)
    expect(result.imported).toEqual([])
    expect(result.skipped.sort()).toEqual(['empty.txt', 'gone.txt', 'huge.md'])
  })
})
