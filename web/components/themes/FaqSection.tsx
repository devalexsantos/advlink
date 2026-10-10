import type { CSSProperties } from "react"

export type FaqItem = { id: string; question: string; answer: string; position?: number }
export type FaqArea = { id: string; title: string; faqs?: FaqItem[] | null }

type Props = {
  areas: FaqArea[]
  /** Text color (questions, answers). */
  text: string
  /** Border/accent color for each item. */
  borderColor: string
  /** Color of the per-area headings (h3). */
  headingColor?: string
  className?: string
  itemClassName?: string
  itemStyle?: CSSProperties
  summaryClassName?: string
  answerClassName?: string
  headingClassName?: string
}

/** Native <details> accordion with the FAQs of each area. Renders nothing without FAQs. */
export default function FaqSection({
  areas,
  text,
  borderColor,
  headingColor,
  className = "",
  itemClassName = "rounded-xl border",
  itemStyle,
  summaryClassName = "",
  answerClassName = "",
  headingClassName = "",
}: Props) {
  const groups = areas
    .map((a) => ({
      id: a.id,
      title: a.title,
      faqs: [...(a.faqs ?? [])]
        .filter((f) => f.question?.trim() && f.answer?.trim())
        .sort((x, y) => (x.position ?? 0) - (y.position ?? 0)),
    }))
    .filter((g) => g.faqs.length > 0)

  if (groups.length === 0) return null
  const showTitles = groups.length > 1

  return (
    <div className={`mx-auto w-full max-w-3xl space-y-8 text-left ${className}`} style={{ color: text }}>
      {groups.map((g) => (
        <div key={g.id} className="space-y-3">
          {showTitles && (
            <h3 className={`text-xl font-semibold ${headingClassName}`} style={{ color: headingColor ?? text }}>
              {g.title}
            </h3>
          )}
          {g.faqs.map((f) => (
            <details key={f.id} className={`group ${itemClassName}`} style={{ borderColor, ...itemStyle }}>
              <summary
                className={`flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden ${summaryClassName}`}
              >
                <span>{f.question}</span>
                <span aria-hidden className="shrink-0 text-xl leading-none transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className={`whitespace-pre-line px-4 pb-4 text-sm leading-relaxed opacity-90 ${answerClassName}`}>{f.answer}</p>
            </details>
          ))}
        </div>
      ))}
    </div>
  )
}

export function hasFaqs(areas: FaqArea[]): boolean {
  return areas.some((a) => (a.faqs ?? []).some((f) => f.question?.trim() && f.answer?.trim()))
}
