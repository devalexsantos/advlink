import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import CustomSectionRenderer from "@/components/themes/CustomSectionRenderer"

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    section: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, whileInView, viewport, transition, ...rest } = props as Record<string, unknown>
      return <section {...(rest as React.HTMLAttributes<HTMLElement>)}>{children}</section>
    },
  },
}))

vi.mock("@/lib/render-content", () => ({
  renderContent: (content: string | null) => content || "",
}))

vi.mock("@/lib/icon-renderer", () => ({
  getIconComponent: () => null,
}))

const baseProps = {
  label: "Test Section",
  iconName: "FileText",
  primary: "#000000",
  text: "#ffffff",
  secondary: "#333333",
  themeVariant: "modern" as const,
}

describe("CustomSectionRenderer", () => {
  it("renders text-only layout", () => {
    render(
      <CustomSectionRenderer
        {...baseProps}
        section={{
          id: "1",
          title: "Sobre",
          description: "<p>Hello</p>",
          imageUrl: null,
          layout: "text-only",
          iconName: "FileText",
        }}
      />
    )
    expect(screen.getByText("Test Section")).toBeInTheDocument()
  })

  it("renders video layout with YouTube URL", () => {
    const { container } = render(
      <CustomSectionRenderer
        {...baseProps}
        section={{
          id: "2",
          title: "Meu Vídeo",
          description: null,
          imageUrl: null,
          layout: "video",
          iconName: "Video",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        }}
      />
    )
    const iframe = container.querySelector("iframe")
    expect(iframe).toBeTruthy()
    expect(iframe?.getAttribute("src")).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ")
  })

  it("renders video layout with Vimeo URL", () => {
    const { container } = render(
      <CustomSectionRenderer
        {...baseProps}
        section={{
          id: "3",
          title: "Vimeo Video",
          description: null,
          imageUrl: null,
          layout: "video",
          iconName: "Video",
          videoUrl: "https://vimeo.com/123456789",
        }}
      />
    )
    const iframe = container.querySelector("iframe")
    expect(iframe).toBeTruthy()
    expect(iframe?.getAttribute("src")).toBe("https://player.vimeo.com/video/123456789")
  })

  it("renders button layout with correct styles", () => {
    render(
      <CustomSectionRenderer
        {...baseProps}
        section={{
          id: "4",
          title: "CTA",
          description: null,
          imageUrl: null,
          layout: "button",
          iconName: "MousePointerClick",
          buttonConfig: {
            url: "https://example.com",
            label: "Agende agora",
            bgColor: "#ff0000",
            textColor: "#ffffff",
            borderRadius: 12,
          },
        }}
      />
    )
    const link = screen.getByText("Agende agora")
    expect(link).toBeInTheDocument()
    expect(link.tagName).toBe("A")
    expect(link).toHaveAttribute("href", "https://example.com")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveStyle({ backgroundColor: "#ff0000", color: "#ffffff" })
  })

  it("renders button with fallback label when label is empty", () => {
    render(
      <CustomSectionRenderer
        {...baseProps}
        section={{
          id: "5",
          title: "CTA",
          description: null,
          imageUrl: null,
          layout: "button",
          iconName: "MousePointerClick",
          buttonConfig: {
            url: "https://example.com",
            label: "",
            bgColor: "#000",
            textColor: "#fff",
            borderRadius: 8,
          },
        }}
      />
    )
    expect(screen.getByText("Clique aqui")).toBeInTheDocument()
  })

  it("hides title when hideTitle is true", () => {
    render(
      <CustomSectionRenderer
        {...baseProps}
        hideTitle={true}
        section={{
          id: "6",
          title: "Hidden Section",
          description: "<p>Content</p>",
          imageUrl: null,
          layout: "text-only",
          iconName: "FileText",
        }}
      />
    )
    expect(screen.queryByText("Test Section")).not.toBeInTheDocument()
  })

  it("shows title when hideTitle is false", () => {
    render(
      <CustomSectionRenderer
        {...baseProps}
        hideTitle={false}
        section={{
          id: "7",
          title: "Visible Section",
          description: "<p>Content</p>",
          imageUrl: null,
          layout: "text-only",
          iconName: "FileText",
        }}
      />
    )
    expect(screen.getByText("Test Section")).toBeInTheDocument()
  })
})
