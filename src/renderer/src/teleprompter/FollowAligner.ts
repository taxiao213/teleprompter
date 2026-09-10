/**
 * Speech-to-script aligner for follow mode.
 *
 * Strategy: normalize both sides (strip punctuation/whitespace, lowercase),
 * keep a cursor into the script's character stream, and on every ASR update
 * find where the tail of the recognized text best matches within a sliding
 * window around the cursor. Limited backtracking allows the speaker to
 * re-read a line; unmatched stretches (silence, ad-libbing) hold the cursor
 * still instead of jumping around.
 */

/** A candidate position must match at least this many characters. */
const MIN_MATCH_CHARS = 4
/** Fraction of mismatched characters tolerated inside a match (ASR noise). */
const MISMATCH_TOLERANCE = 0.25
/** How far back the cursor may jump (re-reading a sentence). */
const BACKTRACK_CHARS = 24
/** How far ahead we look for the next match (skipping ahead). */
const LOOKAHEAD_CHARS = 80
/** Recognized-text tail length used for matching. */
const RECOGNIZED_WINDOW = 32

export class FollowAligner {
  /** One entry per normalized script character: the line it belongs to. */
  private lineOfChar: number[] = []
  private normalizedText = ''
  private cursor = 0
  /** Finalized ASR text accumulated across endpoints. */
  private committed = ''

  setScript(lines: string[]): void {
    const parts: string[] = []
    const lineOfChar: number[] = []
    lines.forEach((line, lineIndex) => {
      const normalized = normalize(line)
      for (let i = 0; i < normalized.length; i += 1) lineOfChar.push(lineIndex)
      parts.push(normalized)
    })
    this.normalizedText = parts.join('')
    this.lineOfChar = lineOfChar
    this.reset()
  }

  reset(): void {
    this.cursor = 0
    this.committed = ''
  }

  /**
   * Feed one ASR update. Returns the line the speaker has reached, or null
   * when nothing confident changed (caller holds the current position).
   */
  feed(recognizedText: string, isEndpoint: boolean): number | null {
    this.committed = isEndpoint ? this.committed + recognizedText : this.committed
    const recognized = normalize(this.committed + (isEndpoint ? '' : recognizedText))
    const windowText = recognized.slice(-RECOGNIZED_WINDOW)
    if (windowText.length < MIN_MATCH_CHARS || this.normalizedText.length === 0) return null

    const from = Math.max(0, this.cursor - BACKTRACK_CHARS)
    const to = Math.min(this.normalizedText.length, this.cursor + LOOKAHEAD_CHARS)

    let bestEnd = -1
    let bestLength = 0
    for (let position = from; position < to; position += 1) {
      const matchLength = fuzzySuffixMatch(windowText, this.normalizedText, position)
      if (matchLength > bestLength) {
        bestLength = matchLength
        bestEnd = position + matchLength
      }
    }

    // Hold position on silence / off-script talking / no improvement.
    if (bestLength < MIN_MATCH_CHARS || bestEnd === this.cursor) return null

    this.cursor = bestEnd
    const charIndex = Math.min(this.cursor, this.normalizedText.length) - 1
    return charIndex >= 0 ? (this.lineOfChar[charIndex] ?? null) : 0
  }
}

function normalize(text: string): string {
  // Keep CJK characters, latin letters and digits; drop punctuation and spaces.
  return text.toLowerCase().replace(/[^\p{Script=Han}a-z0-9]/gu, '')
}

/**
 * Length of the longest suffix of `recognized` that approximately matches the
 * script starting at `position` (mismatches tolerated up to MISMATCH_TOLERANCE).
 */
function fuzzySuffixMatch(recognized: string, script: string, position: number): number {
  const maxLength = Math.min(recognized.length, script.length - position)
  for (let length = maxLength; length >= MIN_MATCH_CHARS; length -= 1) {
    const recognizedStart = recognized.length - length
    let mismatches = 0
    const allowed = Math.floor(length * MISMATCH_TOLERANCE)
    for (let i = 0; i < length; i += 1) {
      if (recognized[recognizedStart + i] !== script[position + i]) {
        mismatches += 1
        if (mismatches > allowed) break
      }
    }
    if (mismatches <= allowed) return length
  }
  return 0
}
