import { dialog, type BrowserWindow } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import type { ImportResult, Script } from '../../shared/types'
import { MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH } from '../../shared/validate'
import { createScript } from './scriptRepo'

const SUPPORTED_EXTENSIONS = ['md', 'markdown', 'txt']

/**
 * Let the user pick markdown/plain-text files and import each as a script.
 * The file name (without extension) becomes the title; oversized or
 * unreadable files are skipped and reported by name.
 */
export async function importScripts(win: BrowserWindow | null): Promise<ImportResult> {
  const options = {
    properties: ['openFile', 'multiSelections'] as Array<'openFile' | 'multiSelections'>,
    filters: [
      { name: 'Markdown / Text', extensions: SUPPORTED_EXTENSIONS },
      { name: 'All Files', extensions: ['*'] },
    ],
  }
  const picked = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  if (picked.canceled || picked.filePaths.length === 0) return { imported: [], skipped: [] }

  const imported: Script[] = []
  const skipped: string[] = []
  for (const filePath of picked.filePaths) {
    const name = basename(filePath)
    try {
      const content = await readFile(filePath, 'utf8')
      if (content.length === 0 || content.length > MAX_CONTENT_LENGTH) {
        skipped.push(name)
        continue
      }
      const title = basename(filePath, extname(filePath)).slice(0, MAX_TITLE_LENGTH) || name
      imported.push(await createScript({ title, content }))
    } catch {
      skipped.push(name)
    }
  }
  return { imported, skipped }
}
