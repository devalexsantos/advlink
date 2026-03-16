import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useIsMobile } from "@/hooks/use-mobile"

describe("useIsMobile()", () => {
  let listeners: Array<() => void> = []

  beforeEach(() => {
    listeners = []
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      addEventListener: (_: string, cb: () => void) => { listeners.push(cb) },
      removeEventListener: vi.fn(),
    })))
  })

  it("returns false for desktop viewport", () => {
    vi.stubGlobal("innerWidth", 1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("returns true for mobile viewport", () => {
    vi.stubGlobal("innerWidth", 375)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("responds to resize", () => {
    vi.stubGlobal("innerWidth", 1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      vi.stubGlobal("innerWidth", 375)
      listeners.forEach((cb) => cb())
    })
    expect(result.current).toBe(true)
  })
})
