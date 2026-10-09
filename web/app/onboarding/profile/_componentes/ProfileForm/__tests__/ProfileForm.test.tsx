import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { mockFetch, mockReplace, mockShowToast } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockReplace: vi.fn(),
  mockShowToast: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}))

vi.mock("@/components/toast/ToastProvider", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

// The cropper is only rendered inside the avatar dialog, which these tests never open.
vi.mock("next/dynamic", () => ({
  default: () => () => null,
}))

import { ProfileForm } from "../ProfileForm"

const next = () => userEvent.click(screen.getByRole("button", { name: /avançar/i }))
const finish = () => userEvent.click(screen.getByRole("button", { name: /salvar e concluir/i }))

async function fillStep1() {
  await userEvent.type(screen.getByLabelText(/nome de exibição/i), "João Silva")
  await next()
  await screen.findByRole("heading", { name: "Áreas de atuação" })
}

async function fillStep2() {
  await userEvent.click(screen.getByRole("button", { name: "Civil" }))
  await next()
  await screen.findByRole("heading", { name: "Informações para contato" })
}

async function goToStep5() {
  await fillStep1()
  await fillStep2()
  await next()
  await screen.findByRole("heading", { name: "Fotos" })
  await next()
  await screen.findByRole("heading", { name: "Social" })
}

function jsonResponse(ok: boolean, status: number, body: unknown = {}) {
  return { ok, status, json: async () => body }
}

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => "blob:mock")
    URL.revokeObjectURL = vi.fn()
  })

  describe("step validation", () => {
    it("blocks step 1 when the display name is empty", async () => {
      render(<ProfileForm />)
      await next()
      expect(await screen.findByText("Informe pelo menos 2 caracteres.")).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "Sobre você ou seu escritório" })).toBeInTheDocument()
    })

    it("blocks step 2 until at least one practice area is added", async () => {
      render(<ProfileForm />)
      await fillStep1()
      await next()
      expect(await screen.findByText("Adicione pelo menos uma área de atuação.")).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "Áreas de atuação" })).toBeInTheDocument()
    })

    it("blocks step 3 and shows the error when the email is invalid", async () => {
      render(<ProfileForm />)
      await fillStep1()
      await fillStep2()
      await userEvent.type(screen.getByLabelText(/e-mail para contato/i), "joao@")
      await next()
      expect(await screen.findByText("Informe um e-mail válido.")).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "Informações para contato" })).toBeInTheDocument()
    })

    it("advances from step 3 once the email is corrected", async () => {
      render(<ProfileForm />)
      await fillStep1()
      await fillStep2()
      const email = screen.getByLabelText(/e-mail para contato/i)
      await userEvent.type(email, "joao@")
      await next()
      await screen.findByText("Informe um e-mail válido.")
      await userEvent.type(email, "exemplo.com")
      await next()
      expect(await screen.findByRole("heading", { name: "Fotos" })).toBeInTheDocument()
    })

    it("stays on the final step and does not submit when a social URL is invalid", async () => {
      render(<ProfileForm />)
      await goToStep5()
      await userEvent.type(screen.getByLabelText(/calendly url/i), "https://exemplo.com/joao")
      await finish()
      expect(await screen.findByText("A URL deve iniciar com https://calendly.com/")).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "Social" })).toBeInTheDocument()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("successful submission", () => {
    it("posts the profile including calendlyUrl and redirects to /profile/edit", async () => {
      mockFetch.mockResolvedValue(jsonResponse(true, 200))
      render(<ProfileForm />)
      await goToStep5()
      await userEvent.type(screen.getByLabelText(/calendly url/i), "https://calendly.com/joao")
      await finish()

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/profile/edit"))
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe("/api/onboarding/profile")
      expect(init.method).toBe("POST")
      const body = init.body as FormData
      expect(body.get("displayName")).toBe("João Silva")
      expect(body.get("areas")).toBe(JSON.stringify(["Civil"]))
      expect(body.get("calendlyUrl")).toBe("https://calendly.com/joao")
      expect(mockShowToast).not.toHaveBeenCalled()
    })
  })

  describe("failed profile submission", () => {
    it("shows the server error for 4xx responses and does not redirect", async () => {
      mockFetch.mockResolvedValue(jsonResponse(false, 400, { error: "Nome já em uso" }))
      render(<ProfileForm />)
      await goToStep5()
      await finish()

      expect(await screen.findByRole("alert")).toHaveTextContent("Nome já em uso")
      expect(mockReplace).not.toHaveBeenCalled()
    })

    it("shows a generic message for 5xx responses instead of the technical server error", async () => {
      mockFetch.mockResolvedValue(jsonResponse(false, 500, { error: "PrismaClientKnownRequestError P2002" }))
      render(<ProfileForm />)
      await goToStep5()
      await finish()

      const alert = await screen.findByRole("alert")
      expect(alert).toHaveTextContent(/não foi possível salvar agora/i)
      expect(alert).not.toHaveTextContent(/prisma/i)
      expect(mockReplace).not.toHaveBeenCalled()
    })

    it("shows a connection message when fetch throws", async () => {
      mockFetch.mockRejectedValue(new Error("offline"))
      render(<ProfileForm />)
      await goToStep5()
      await finish()

      expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível conectar/i)
      expect(mockReplace).not.toHaveBeenCalled()
    })

    it("lets the user retry after an error and clears the message", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(false, 400, { error: "Tente de novo" }))
      mockFetch.mockResolvedValueOnce(jsonResponse(true, 200))
      render(<ProfileForm />)
      await goToStep5()
      await finish()
      await screen.findByRole("alert")

      await finish()
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/profile/edit"))
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  describe("gallery uploads", () => {
    async function addGalleryPhotos(count: number) {
      await fillStep1()
      await fillStep2()
      await next()
      await screen.findByRole("heading", { name: "Fotos" })
      const input = document.getElementById("gallery-input") as HTMLInputElement
      const files = Array.from({ length: count }, (_, i) => new File(["x"], `foto-${i}.jpg`, { type: "image/jpeg" }))
      await userEvent.upload(input, files)
      await next()
      await screen.findByRole("heading", { name: "Social" })
    }

    it("toasts the number of failed uploads but still redirects", async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/gallery") return jsonResponse(false, 500)
        return jsonResponse(true, 200)
      })
      render(<ProfileForm />)
      await addGalleryPhotos(2)
      await finish()

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/profile/edit"))
      expect(mockShowToast).toHaveBeenCalledTimes(1)
      expect(mockShowToast.mock.calls[0][0]).toMatch(/2 fotos não puderam ser enviadas/i)
    })

    it("counts uploads that throw as failures and uses the singular message for one", async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/gallery") throw new Error("offline")
        return jsonResponse(true, 200)
      })
      render(<ProfileForm />)
      await addGalleryPhotos(1)
      await finish()

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/profile/edit"))
      expect(mockShowToast.mock.calls[0][0]).toMatch(/1 foto não pôde ser enviada/i)
    })

    it("does not toast when every upload succeeds", async () => {
      mockFetch.mockResolvedValue(jsonResponse(true, 200))
      render(<ProfileForm />)
      await addGalleryPhotos(2)
      await finish()

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/profile/edit"))
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockShowToast).not.toHaveBeenCalled()
    })
  })
})
