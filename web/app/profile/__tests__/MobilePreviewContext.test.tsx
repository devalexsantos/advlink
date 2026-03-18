import { describe, it, expect } from "vitest"
import { render, renderHook, act } from "@testing-library/react"
import React from "react"
import { MobilePreviewProvider, useMobilePreview } from "@/app/profile/MobilePreviewContext"

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MobilePreviewProvider>{children}</MobilePreviewProvider>
}

describe("MobilePreviewContext", () => {
  describe("useMobilePreview — default context", () => {
    it("returns mobilePreview=false when used outside the Provider (default context value)", () => {
      // The context has a default value so it does not throw outside the provider
      const { result } = renderHook(() => useMobilePreview())
      expect(result.current.mobilePreview).toBe(false)
    })

    it("exposes setMobilePreview as a function even outside the Provider", () => {
      const { result } = renderHook(() => useMobilePreview())
      expect(typeof result.current.setMobilePreview).toBe("function")
    })
  })

  describe("MobilePreviewProvider", () => {
    it("exposes mobilePreview=false by default", () => {
      const { result } = renderHook(() => useMobilePreview(), { wrapper: Wrapper })
      expect(result.current.mobilePreview).toBe(false)
    })

    it("exposes a setMobilePreview function", () => {
      const { result } = renderHook(() => useMobilePreview(), { wrapper: Wrapper })
      expect(typeof result.current.setMobilePreview).toBe("function")
    })

    it("updates mobilePreview to true after setMobilePreview(true)", () => {
      const { result } = renderHook(() => useMobilePreview(), { wrapper: Wrapper })
      act(() => {
        result.current.setMobilePreview(true)
      })
      expect(result.current.mobilePreview).toBe(true)
    })

    it("updates mobilePreview back to false after toggling off", () => {
      const { result } = renderHook(() => useMobilePreview(), { wrapper: Wrapper })

      act(() => {
        result.current.setMobilePreview(true)
      })
      expect(result.current.mobilePreview).toBe(true)

      act(() => {
        result.current.setMobilePreview(false)
      })
      expect(result.current.mobilePreview).toBe(false)
    })

    it("renders children inside the provider", () => {
      const { getByText } = render(
        <MobilePreviewProvider>
          <span>child</span>
        </MobilePreviewProvider>
      )
      expect(getByText("child")).toBeInTheDocument()
    })
  })
})
