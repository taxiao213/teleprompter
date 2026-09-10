import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

let userDataDir = ''

// scriptRepo resolves its storage from app.getPath('userData') — point it at
// a throwaway temp directory for the whole suite.
vi.mock('electron', () => ({
  app: {
    getPath: (_name: string): string => userDataDir,
  },
}))

const { listScripts, getScript, createScript, updateScript, deleteScript } = await import(
  './scriptRepo'
)

beforeAll(async () => {
  userDataDir = await mkdtemp(join(tmpdir(), 'tp-scripts-'))
})

afterAll(async () => {
  await rm(userDataDir, { recursive: true, force: true })
})

describe('scriptRepo', () => {
  it('creates, lists, reads, updates and deletes scripts', async () => {
    const created = await createScript({ title: '开场白', content: '大家好' })
    expect(created.id).toBeTruthy()
    expect(created.title).toBe('开场白')

    const listed = await listScripts()
    expect(listed.map((s) => s.id)).toContain(created.id)

    const fetched = await getScript(created.id)
    expect(fetched?.content).toBe('大家好')

    const updated = await updateScript(created.id, { content: '大家好，欢迎回来' })
    expect(updated?.content).toBe('大家好，欢迎回来')
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)

    expect(await deleteScript(created.id)).toBe(true)
    expect(await getScript(created.id)).toBeNull()
    expect(await deleteScript(created.id)).toBe(false)
  })

  it('falls back to a default title and returns null for unknown ids', async () => {
    const created = await createScript()
    expect(created.title).toBe('Untitled')
    expect(await updateScript('no-such-id', { title: 'x' })).toBeNull()
    await deleteScript(created.id)
  })

  it('sorts by updatedAt descending', async () => {
    const a = await createScript({ title: 'A' })
    const b = await createScript({ title: 'B' })
    // Ensure the timestamps actually differ (operations can share a ms).
    await new Promise((resolve) => setTimeout(resolve, 5))
    // Touch A so it becomes the most recently updated.
    await updateScript(a.id, { content: 'touched' })
    const listed = await listScripts()
    expect(listed[0]?.id).toBe(a.id)
    expect(listed.some((s) => s.id === b.id)).toBe(true)
    await deleteScript(a.id)
    await deleteScript(b.id)
  })

  it('skips corrupted files instead of failing the listing', async () => {
    const good = await createScript({ title: 'Good' })
    const dir = join(userDataDir, 'scripts')
    await writeFile(join(dir, 'broken.json'), '{ not json', 'utf8')
    await writeFile(
      join(dir, 'wrong-shape.json'),
      JSON.stringify({ id: 1, title: null }),
      'utf8',
    )
    const listed = await listScripts()
    expect(listed.some((s) => s.id === good.id)).toBe(true)
    expect(listed.every((s) => typeof s.title === 'string')).toBe(true)
    await deleteScript(good.id)
  })
})
