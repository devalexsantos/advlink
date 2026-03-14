import { marked } from "marked"

export function renderContent(content: string | null | undefined): string {
  if (!content) return ""
  const hasHtmlTags = /<(?:p|div|h[1-6]|ul|ol|li|blockquote|span|strong|em|a)\b/i.test(content)
  if (hasHtmlTags) return content
  return marked.parse(content, { breaks: true }) as string
}
