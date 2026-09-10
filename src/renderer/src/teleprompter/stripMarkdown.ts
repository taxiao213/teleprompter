/**
 * Strip markdown syntax for prompting display: the speaker reads plain text,
 * so headings, emphasis, links and list markers must not appear on screen.
 * Conservative by design — only removes unambiguous constructs, never
 * reorders or rewrites content.
 */

const FENCE_RE = /^\s*(```|~~~)/
const HEADING_RE = /^\s{0,3}#{1,6}\s+/
const BLOCKQUOTE_RE = /^\s{0,3}>\s?/
const HR_RE = /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/
const UNORDERED_LIST_RE = /^(\s*)[-*+]\s+/
const ORDERED_LIST_RE = /^(\s*)\d{1,9}[.)]\s+/

export function stripMarkdown(line: string): string {
  // Line-level constructs first.
  if (FENCE_RE.test(line) || HR_RE.test(line)) return ''
  let text = line
    .replace(HEADING_RE, '')
    .replace(BLOCKQUOTE_RE, '')
    .replace(UNORDERED_LIST_RE, '$1')
    .replace(ORDERED_LIST_RE, '$1')

  // Images before links (both share the [text](url) shape).
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  // Reference-style links: [text][ref] and bare [ref][].
  text = text.replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')

  // Inline code, bold, italic, strikethrough — innermost spans first.
  text = text.replace(/`([^`]+)`/g, '$1')
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/~~([^~]+)~~/g, '$1')
  // Single * / _ emphasis; content must hug the markers (CommonMark rule) so
  // "2 * 3 * 4" survives, and underscores need non-word boundaries so
  // snake_case_identifiers survive.
  text = text.replace(/\*(\S(?:[^*\n]*\S)?)\*/g, '$1')
  text = text.replace(/(?<![\w])_(\S(?:[^_\n]*\S)?)_(?![\w])/g, '$1')

  return text
}
