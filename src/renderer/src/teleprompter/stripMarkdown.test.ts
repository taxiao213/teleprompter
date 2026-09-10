import { describe, expect, it } from 'vitest'
import { stripMarkdown } from './stripMarkdown'

describe('stripMarkdown', () => {
  it('strips headings', () => {
    expect(stripMarkdown('# 开场白')).toBe('开场白')
    expect(stripMarkdown('### 第三章 产品介绍')).toBe('第三章 产品介绍')
  })

  it('strips emphasis and keeps the text', () => {
    expect(stripMarkdown('这是**重点**内容')).toBe('这是重点内容')
    expect(stripMarkdown('这是*强调*内容')).toBe('这是强调内容')
    expect(stripMarkdown('这是__粗体__和_斜体_')).toBe('这是粗体和斜体')
    expect(stripMarkdown('这是~~删除线~~文字')).toBe('这是删除线文字')
  })

  it('strips list markers but keeps indentation', () => {
    expect(stripMarkdown('- 第一点')).toBe('第一点')
    expect(stripMarkdown('  * 子项')).toBe('  子项')
    expect(stripMarkdown('1. 第一步')).toBe('第一步')
    expect(stripMarkdown('12) 第十二步')).toBe('第十二步')
  })

  it('strips blockquotes', () => {
    expect(stripMarkdown('> 引用的一句话')).toBe('引用的一句话')
  })

  it('converts links and images to their visible text', () => {
    expect(stripMarkdown('请看[这个视频](https://example.com)')).toBe('请看这个视频')
    expect(stripMarkdown('![封面图](cover.png)')).toBe('封面图')
    expect(stripMarkdown('参考[文档][1]')).toBe('参考文档')
  })

  it('drops fences and horizontal rules', () => {
    expect(stripMarkdown('```js')).toBe('')
    expect(stripMarkdown('```')).toBe('')
    expect(stripMarkdown('---')).toBe('')
    expect(stripMarkdown('***')).toBe('')
  })

  it('strips inline code', () => {
    expect(stripMarkdown('按 `Ctrl+C` 复制')).toBe('按 Ctrl+C 复制')
  })

  it('leaves plain text and lookalikes untouched', () => {
    expect(stripMarkdown('大家好，欢迎收看本期视频。')).toBe('大家好，欢迎收看本期视频。')
    expect(stripMarkdown('变量 snake_case_name 不受影响')).toBe('变量 snake_case_name 不受影响')
    expect(stripMarkdown('价格是 2 * 3 * 4 元')).toBe('价格是 2 * 3 * 4 元')
    expect(stripMarkdown('#没有空格的井号不是标题')).toBe('#没有空格的井号不是标题')
  })
})
