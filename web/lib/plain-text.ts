/** Plain text only: drops HTML tags and control characters (keeps newlines when allowed). */
export function toPlainText(value: string, opts: { multiline?: boolean } = {}): string {
  const noTags = value.replace(/<[^>]*>/g, "")
  const noControl = opts.multiline ? noTags.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "") : noTags.replace(/[\u0000-\u001F\u007F]/g, " ")
  return noControl.replace(/\r\n?/g, "\n").trim()
}
