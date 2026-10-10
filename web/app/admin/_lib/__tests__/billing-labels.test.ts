import { describe, it, expect } from "vitest"
import { cycleLabel, formatSubscriptionValue } from "@/app/admin/_lib/billing-labels"

describe("billing labels: cycle", () => {
  it("labels the cycle, legacy rows as monthly", () => {
    expect(cycleLabel("MONTHLY")).toBe("Mensal")
    expect(cycleLabel("YEARLY")).toBe("Anual")
    expect(cycleLabel(null)).toBe("Mensal")
  })

  it("formats the subscription value with its period", () => {
    expect(formatSubscriptionValue(4900, "MONTHLY")).toMatch(/^R\$\s49,00\/mês$/)
    expect(formatSubscriptionValue(49000, "YEARLY")).toMatch(/^R\$\s490,00\/ano$/)
    expect(formatSubscriptionValue(4900, undefined)).toMatch(/\/mês$/)
  })
})
