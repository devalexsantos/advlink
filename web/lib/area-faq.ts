/** Limits and sanitization shared by the area FAQ API, the AI generator and the editor. */
export const MAX_FAQS_PER_AREA = 8
export const MAX_FAQ_QUESTION_LENGTH = 150
export const MAX_FAQ_ANSWER_LENGTH = 700

/** FAQs are plain text: drops any HTML tags and trims. */
export function toFaqPlainText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .trim()
}
