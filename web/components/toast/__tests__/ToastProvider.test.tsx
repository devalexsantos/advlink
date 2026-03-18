import { describe, it, expect, vi } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderHook } from "@testing-library/react"
import React from "react"
import { ToastProvider, useToast } from "@/components/toast/ToastProvider"

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe("ToastProvider", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <span>child content</span>
      </ToastProvider>
    )
    expect(screen.getByText("child content")).toBeInTheDocument()
  })

  it("does not show any toasts initially", () => {
    render(<ToastProvider><div /></ToastProvider>)
    // No close buttons means no toasts are visible
    expect(screen.queryByLabelText("Fechar notificação")).not.toBeInTheDocument()
  })
})

describe("useToast", () => {
  it("throws when used outside ToastProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => renderHook(() => useToast())).toThrow(
      "useToast must be used within a ToastProvider"
    )
    consoleSpy.mockRestore()
  })

  it("exposes a showToast function", () => {
    const { result } = renderHook(() => useToast(), { wrapper: Wrapper })
    expect(typeof result.current.showToast).toBe("function")
  })

  it("displays a toast message after showToast is called", async () => {
    function TestComponent() {
      const { showToast } = useToast()
      return (
        <button onClick={() => showToast("Salvo com sucesso")}>mostrar toast</button>
      )
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await userEvent.click(screen.getByRole("button", { name: "mostrar toast" }))
    expect(screen.getByText("Salvo com sucesso")).toBeInTheDocument()
  })

  it("shows the dismiss button on each toast", async () => {
    function TestComponent() {
      const { showToast } = useToast()
      return (
        <button onClick={() => showToast("Toast A")}>mostrar toast</button>
      )
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await userEvent.click(screen.getByRole("button", { name: "mostrar toast" }))
    expect(screen.getByLabelText("Fechar notificação")).toBeInTheDocument()
  })

  it("removes a toast when the dismiss button is clicked", async () => {
    function TestComponent() {
      const { showToast } = useToast()
      return (
        <button onClick={() => showToast("Mensagem temporária")}>mostrar toast</button>
      )
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await userEvent.click(screen.getByRole("button", { name: "mostrar toast" }))
    expect(screen.getByText("Mensagem temporária")).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText("Fechar notificação"))
    expect(screen.queryByText("Mensagem temporária")).not.toBeInTheDocument()
  })

  it("can display multiple toasts at the same time", async () => {
    function TestComponent() {
      const { showToast } = useToast()
      return (
        <>
          <button onClick={() => showToast("Toast 1")}>toast 1</button>
          <button onClick={() => showToast("Toast 2")}>toast 2</button>
        </>
      )
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await userEvent.click(screen.getByRole("button", { name: "toast 1" }))
    await userEvent.click(screen.getByRole("button", { name: "toast 2" }))

    expect(screen.getByText("Toast 1")).toBeInTheDocument()
    expect(screen.getByText("Toast 2")).toBeInTheDocument()
  })
})
