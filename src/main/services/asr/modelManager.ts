import { app } from 'electron'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { get } from 'node:https'
import { join } from 'node:path'

/**
 * Model: streaming bilingual (zh/en) zipformer transducer, int8 quantized.
 * Source: ModelScope (reachable in mainland China without a proxy).
 * Files are fetched one by one so we skip the fp32 duplicates in the repo.
 */
const MODEL_REPO =
  'https://modelscope.cn/models/pkufool/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20/resolve/master'

const FILES: Array<{ name: string; expectedBytes: number }> = [
  { name: 'encoder-epoch-99-avg-1.int8.onnx', expectedBytes: 181895032 },
  { name: 'decoder-epoch-99-avg-1.int8.onnx', expectedBytes: 13091040 },
  { name: 'joiner-epoch-99-avg-1.int8.onnx', expectedBytes: 3228404 },
  { name: 'tokens.txt', expectedBytes: 56317 },
]

const TOTAL_BYTES = FILES.reduce((sum, f) => sum + f.expectedBytes, 0)

// ModelScope's LFS CDN rejects requests without a User-Agent (403).
const REQUEST_HEADERS = { 'User-Agent': 'StealthPrompter/0.1 (+https://modelscope.cn)' }

export function modelDir(): string {
  return join(app.getPath('userData'), 'models', 'zipformer-bilingual')
}

export function modelFiles(dir: string): {
  encoder: string
  decoder: string
  joiner: string
  tokens: string
} {
  return {
    encoder: join(dir, FILES[0].name),
    decoder: join(dir, FILES[1].name),
    joiner: join(dir, FILES[2].name),
    tokens: join(dir, FILES[3].name),
  }
}

export async function isModelReady(): Promise<boolean> {
  const files = modelFiles(modelDir())
  for (const [index, file] of FILES.entries()) {
    try {
      const info = await stat(Object.values(files)[index])
      if (info.size !== file.expectedBytes) return false
    } catch {
      return false
    }
  }
  return true
}

/**
 * Download all model files with aggregate progress (0–1).
 * Throws on failure; partial files are cleaned up.
 */
export async function downloadModel(onProgress: (progress: number) => void): Promise<void> {
  const dir = modelDir()
  await mkdir(dir, { recursive: true })
  let downloaded = 0

  try {
    for (const file of FILES) {
      const target = join(dir, file.name)
      const temp = `${target}.part`
      await downloadFile(`${MODEL_REPO}/${file.name}`, temp, file.expectedBytes, (fileBytes) => {
        onProgress((downloaded + fileBytes) / TOTAL_BYTES)
      })
      await rename(temp, target)
      downloaded += file.expectedBytes
      onProgress(downloaded / TOTAL_BYTES)
    }
  } catch (error) {
    await rm(dir, { recursive: true, force: true })
    throw error
  }
}

function downloadFile(
  url: string,
  target: string,
  expectedBytes: number,
  onBytes: (bytes: number) => void,
  redirectsLeft = 5,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = get(url, { headers: REQUEST_HEADERS }, (response) => {
      // Follow redirects (ModelScope 302s to CDN).
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
        response.resume()
        const location = response.headers.location
        if (!location || redirectsLeft === 0) {
          reject(new Error(`redirect without location for ${url}`))
          return
        }
        downloadFile(location, target, expectedBytes, onBytes, redirectsLeft - 1).then(resolve, reject)
        return
      }
      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`HTTP ${response.statusCode} for ${url}`))
        return
      }

      const out = createWriteStream(target)
      let received = 0
      response.on('data', (chunk: Buffer) => {
        received += chunk.length
        onBytes(received)
      })
      response.pipe(out)
      out.on('finish', () => {
        out.close(() => {
          if (expectedBytes > 0 && received !== expectedBytes) {
            reject(new Error(`size mismatch: got ${received}, expected ${expectedBytes}`))
            return
          }
          resolve()
        })
      })
      out.on('error', reject)
      response.on('error', reject)
    })
    request.on('error', reject)
    request.setTimeout(30_000, () => request.destroy(new Error('download timeout')))
  })
}
