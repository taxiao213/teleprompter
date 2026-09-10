import { describe, expect, it } from 'vitest'
import { FollowAligner } from './FollowAligner'

const LINES = ['大家好，欢迎来到我的频道', '今天我们来聊聊提词器', '它能让你看着镜头念稿子']

function makeAligner(): FollowAligner {
  const aligner = new FollowAligner()
  aligner.setScript(LINES)
  return aligner
}

describe('FollowAligner', () => {
  it('advances to the line being read', () => {
    const aligner = makeAligner()
    expect(aligner.feed('大家好欢迎来到我的频道', true)).toBe(0)
    expect(aligner.feed('今天我们来聊聊提词器', true)).toBe(1)
    expect(aligner.feed('它能让你看着镜头念稿子', true)).toBe(2)
  })

  it('holds position on silence or off-script talking', () => {
    const aligner = makeAligner()
    expect(aligner.feed('大家好欢迎来到我的频道', true)).toBe(0)
    expect(aligner.feed('', false)).toBeNull()
    expect(aligner.feed('嗯让我想想接下来要说什么', false)).toBeNull()
  })

  it('holds position when the same line is re-reported', () => {
    const aligner = makeAligner()
    aligner.feed('大家好欢迎来到我的频道', true)
    expect(aligner.feed('今天我们来聊聊提词器', true)).toBe(1)
    // ASR re-emits the same finalized text: no movement.
    expect(aligner.feed('今天我们来聊聊提词器', true)).toBeNull()
  })

  it('backtracks when the speaker re-reads an earlier line', () => {
    const aligner = makeAligner()
    aligner.feed('大家好欢迎来到我的频道', true)
    aligner.feed('今天我们来聊聊提词器', true)
    expect(aligner.feed('大家好欢迎来到我的频道', true)).toBe(0)
  })

  it('tolerates recognition errors inside a match', () => {
    const aligner = makeAligner()
    // Two wrong characters in an 11-char line stay within tolerance.
    expect(aligner.feed('大家好欢迎来倒我的贫道', true)).toBe(0)
  })

  it('ignores fragments shorter than the minimum match', () => {
    const aligner = makeAligner()
    expect(aligner.feed('大家', false)).toBeNull()
    expect(aligner.feed('好', false)).toBeNull()
  })

  it('does not match text that only appears far outside the window', () => {
    const aligner = new FollowAligner()
    // Script long enough that the first line sits beyond LOOKAHEAD_CHARS.
    const filler = '啊'.repeat(120)
    aligner.setScript([filler, '独一无二的结尾句子'])
    expect(aligner.feed('独一无二的结尾句子', true)).toBeNull()
  })

  it('accumulates committed text across endpoints and keeps moving forward', () => {
    const aligner = makeAligner()
    aligner.feed('大家好欢迎来到', false)
    expect(aligner.feed('我的频道', true)).toBe(0)
    // Partial of the next line rides on top of the committed text.
    expect(aligner.feed('今天我们来聊聊', false)).toBe(1)
  })

  it('resets to the beginning', () => {
    const aligner = makeAligner()
    aligner.feed('大家好欢迎来到我的频道', true)
    aligner.feed('今天我们来聊聊提词器', true)
    aligner.reset()
    expect(aligner.feed('大家好欢迎来到我的频道', true)).toBe(0)
  })
})
