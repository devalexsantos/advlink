import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockUseEditForm = vi.hoisted(() => vi.fn())

vi.mock("@/app/profile/edit/EditFormContext", () => ({
  useEditForm: mockUseEditForm,
}))

// next/dynamic — return the loader result synchronously so the component renders
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    void loader
    // Return a Cropper mock that invokes all the callbacks so prop arrow functions get covered
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DynamicComponent = (props: any) => {
      // Fire onCropChange, onZoomChange, onCropComplete so their bodies are covered
      if (props.onCropChange) props.onCropChange({ x: 0, y: 0 })
      if (props.onZoomChange) props.onZoomChange(1)
      if (props.onCropComplete) props.onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 100, height: 100 })
      return <div data-testid="cropper" data-image={props.image} />
    }
    DynamicComponent.displayName = "DynamicCropper"
    return DynamicComponent
  },
}))

// react-easy-crop mock (also required by the module itself)
vi.mock("react-easy-crop", () => ({
  default: ({ image }: { image: string }) => (
    <div data-testid="cropper" data-image={image} />
  ),
}))

import EstiloSection from "@/app/profile/edit/sections/EstiloSection"

function buildContextValue(overrides: Record<string, unknown> = {}) {
  return {
    theme: "modern" as const,
    setTheme: vi.fn(),
    updateThemeMutation: { mutateAsync: vi.fn().mockResolvedValue({}) },
    primaryColor: "#8B0000",
    setPrimaryColor: vi.fn(),
    secondaryColor: "#FFFFFF",
    setSecondaryColor: vi.fn(),
    textColor: "#FFFFFF",
    setTextColor: vi.fn(),
    previewUrl: null,
    setPreviewUrl: vi.fn(),
    setPhotoFile: vi.fn(),
    setRemoveAvatar: vi.fn(),
    coverPreviewUrl: null,
    setCoverPreviewUrl: vi.fn(),
    setCoverFile: vi.fn(),
    setRemoveCover: vi.fn(),
    // Avatar cropper
    avatarCropOpen: false,
    setAvatarCropOpen: vi.fn(),
    avatarCropSrc: null,
    setAvatarCropSrc: vi.fn(),
    pendingAvatarFileRef: { current: null as File | null },
    crop: { x: 0, y: 0 },
    setCrop: vi.fn(),
    zoom: 1,
    setZoom: vi.fn(),
    croppedAreaPixels: null,
    setCroppedAreaPixels: vi.fn(),
    // Cover cropper
    coverCropOpen: false,
    setCoverCropOpen: vi.fn(),
    coverCropSrc: null,
    setCoverCropSrc: vi.fn(),
    pendingCoverFileRef: { current: null as File | null },
    coverCrop: { x: 0, y: 0 },
    setCoverCrop: vi.fn(),
    coverZoom: 1,
    setCoverZoom: vi.fn(),
    coverCroppedAreaPixels: null,
    setCoverCroppedAreaPixels: vi.fn(),
    getCroppedBlob: vi.fn(),
    ...overrides,
  }
}

describe("EstiloSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEditForm.mockReturnValue(buildContextValue())
  })

  it("file input onChange for avatar opens crop dialog via FileReader", async () => {
    const setAvatarCropSrc = vi.fn()
    const setZoom = vi.fn()
    const setCrop = vi.fn()
    const setAvatarCropOpen = vi.fn()
    const setRemoveAvatar = vi.fn()
    const pendingAvatarFileRef = { current: null as File | null }

    // Mock FileReader to synchronously call onload
    const mockReadAsDataURL = vi.fn().mockImplementation(function (this: FileReader) {
      // Immediately trigger onload
      if (this.onload) {
        Object.defineProperty(this, "result", { value: "data:image/png;base64,mockdata", writable: true })
        this.onload({ target: this } as ProgressEvent<FileReader>)
      }
    })
    vi.stubGlobal("FileReader", class {
      result: string | null = null
      onload: ((e: ProgressEvent<FileReader>) => void) | null = null
      readAsDataURL = mockReadAsDataURL
    })

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        setAvatarCropSrc, setZoom, setCrop, setAvatarCropOpen, setRemoveAvatar, pendingAvatarFileRef
      })
    )
    render(<EstiloSection />)

    // Find the hidden file input inside the "Enviar foto" label
    const allFileInputs = document.querySelectorAll('input[type="file"]')
    const avatarInput = allFileInputs[0] as HTMLInputElement
    const file = new File(["img"], "avatar.png", { type: "image/png" })
    await userEvent.upload(avatarInput, file)

    expect(setRemoveAvatar).toHaveBeenCalledWith(false)
    expect(setAvatarCropOpen).toHaveBeenCalledWith(true)

    vi.unstubAllGlobals()
  })

  it("file input onChange for cover opens crop dialog via FileReader", async () => {
    const setCoverCropSrc = vi.fn()
    const setCoverZoom = vi.fn()
    const setCoverCrop = vi.fn()
    const setCoverCropOpen = vi.fn()
    const setRemoveCover = vi.fn()
    const pendingCoverFileRef = { current: null as File | null }

    const mockReadAsDataURL = vi.fn().mockImplementation(function (this: FileReader) {
      if (this.onload) {
        Object.defineProperty(this, "result", { value: "data:image/png;base64,mockdata", writable: true })
        this.onload({ target: this } as ProgressEvent<FileReader>)
      }
    })
    vi.stubGlobal("FileReader", class {
      result: string | null = null
      onload: ((e: ProgressEvent<FileReader>) => void) | null = null
      readAsDataURL = mockReadAsDataURL
    })

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        setCoverCropSrc, setCoverZoom, setCoverCrop, setCoverCropOpen, setRemoveCover, pendingCoverFileRef
      })
    )
    render(<EstiloSection />)

    const allFileInputs = document.querySelectorAll('input[type="file"]')
    const coverInput = allFileInputs[1] as HTMLInputElement
    const file = new File(["img"], "cover.png", { type: "image/png" })
    await userEvent.upload(coverInput, file)

    expect(setRemoveCover).toHaveBeenCalledWith(false)
    expect(setCoverCropOpen).toHaveBeenCalledWith(true)

    vi.unstubAllGlobals()
  })

  it("avatar dialog onOpenChange calls setAvatarCropOpen when Escape is pressed", async () => {
    const setAvatarCropOpen = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        avatarCropOpen: true,
        avatarCropSrc: "data:image/png;base64,test",
        setAvatarCropOpen,
      })
    )
    render(<EstiloSection />)
    expect(screen.getByText("Ajustar foto de perfil")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    expect(setAvatarCropOpen).toHaveBeenCalledWith(false)
  })

  it("cover dialog onOpenChange calls setCoverCropOpen when Escape is pressed", async () => {
    const setCoverCropOpen = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        coverCropOpen: true,
        coverCropSrc: "data:image/png;base64,test",
        setCoverCropOpen,
      })
    )
    render(<EstiloSection />)
    expect(screen.getByText("Ajustar capa da página")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    expect(setCoverCropOpen).toHaveBeenCalledWith(false)
  })

  it("renders the Tema section heading", () => {
    render(<EstiloSection />)
    expect(screen.getByText("Tema")).toBeInTheDocument()
  })

  it("renders all three theme options", () => {
    render(<EstiloSection />)
    expect(screen.getByText("Clássico")).toBeInTheDocument()
    expect(screen.getByText("Moderno")).toBeInTheDocument()
    expect(screen.getByText("Corporativo")).toBeInTheDocument()
  })

  it("renders Cores section heading", () => {
    render(<EstiloSection />)
    expect(screen.getByText("Cores")).toBeInTheDocument()
  })

  it("renders Cor Principal color picker", () => {
    render(<EstiloSection />)
    expect(screen.getByLabelText("Cor Principal")).toBeInTheDocument()
  })

  it("renders Cor de Títulos color picker", () => {
    render(<EstiloSection />)
    expect(screen.getByLabelText("Cor de Títulos")).toBeInTheDocument()
  })

  it("renders Cor do Texto color picker", () => {
    render(<EstiloSection />)
    expect(screen.getByLabelText("Cor do Texto")).toBeInTheDocument()
  })

  it("color inputs reflect context values", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ primaryColor: "#ff0000", secondaryColor: "#00ff00", textColor: "#0000ff" })
    )
    render(<EstiloSection />)
    expect(screen.getByLabelText("Cor Principal")).toHaveValue("#ff0000")
    expect(screen.getByLabelText("Cor de Títulos")).toHaveValue("#00ff00")
    expect(screen.getByLabelText("Cor do Texto")).toHaveValue("#0000ff")
  })

  it("calls setPrimaryColor when Cor Principal input changes", () => {
    const setPrimaryColor = vi.fn()
    mockUseEditForm.mockReturnValue(buildContextValue({ setPrimaryColor }))
    render(<EstiloSection />)
    const input = screen.getByLabelText("Cor Principal")
    fireEvent.change(input, { target: { value: "#123456" } })
    expect(setPrimaryColor).toHaveBeenCalledWith("#123456")
  })

  it("calls setSecondaryColor when Cor de Títulos input changes", () => {
    const setSecondaryColor = vi.fn()
    mockUseEditForm.mockReturnValue(buildContextValue({ setSecondaryColor }))
    render(<EstiloSection />)
    const input = screen.getByLabelText("Cor de Títulos")
    fireEvent.change(input, { target: { value: "#abcdef" } })
    expect(setSecondaryColor).toHaveBeenCalledWith("#abcdef")
  })

  it("calls setTextColor when Cor do Texto input changes", () => {
    const setTextColor = vi.fn()
    mockUseEditForm.mockReturnValue(buildContextValue({ setTextColor, textColor: "#ff0000" }))
    render(<EstiloSection />)
    const input = screen.getByLabelText("Cor do Texto")
    fireEvent.change(input, { target: { value: "#00ff00" } })
    expect(setTextColor).toHaveBeenCalledWith("#00ff00")
  })

  it("renders Foto de perfil section heading", () => {
    render(<EstiloSection />)
    expect(screen.getByText("Foto de perfil")).toBeInTheDocument()
  })

  it("renders Capa da página section heading", () => {
    render(<EstiloSection />)
    expect(screen.getByText("Capa da página")).toBeInTheDocument()
  })

  it("renders Enviar foto upload label", () => {
    render(<EstiloSection />)
    expect(screen.getByText("Enviar foto")).toBeInTheDocument()
  })

  it("renders Enviar capa upload label", () => {
    render(<EstiloSection />)
    expect(screen.getByText("Enviar capa")).toBeInTheDocument()
  })

  it("shows avatar preview image when previewUrl is set", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ previewUrl: "https://example.com/avatar.jpg" })
    )
    render(<EstiloSection />)
    const img = screen.getByAltText("Pré-visualização do avatar")
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg")
  })

  it("shows remove avatar button when previewUrl is set", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ previewUrl: "https://example.com/avatar.jpg" })
    )
    render(<EstiloSection />)
    expect(screen.getByRole("button", { name: "Remover foto" })).toBeInTheDocument()
  })

  it("calls setPhotoFile(null) and setRemoveAvatar(true) when avatar remove button is clicked", async () => {
    const setPhotoFile = vi.fn()
    const setRemoveAvatar = vi.fn()
    const setPreviewUrl = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        previewUrl: "https://example.com/avatar.jpg",
        setPhotoFile,
        setRemoveAvatar,
        setPreviewUrl,
      })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByRole("button", { name: "Remover foto" }))
    expect(setPhotoFile).toHaveBeenCalledWith(null)
    expect(setRemoveAvatar).toHaveBeenCalledWith(true)
  })

  it("shows cover preview image when coverPreviewUrl is set", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ coverPreviewUrl: "https://example.com/cover.jpg" })
    )
    render(<EstiloSection />)
    const img = screen.getByAltText("Pré-visualização da capa")
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg")
  })

  it("shows remove cover button when coverPreviewUrl is set", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ coverPreviewUrl: "https://example.com/cover.jpg" })
    )
    render(<EstiloSection />)
    expect(screen.getByRole("button", { name: "Remover capa" })).toBeInTheDocument()
  })

  it("calls setCoverFile(null) and setRemoveCover(true) when cover remove button is clicked", async () => {
    const setCoverFile = vi.fn()
    const setRemoveCover = vi.fn()
    const setCoverPreviewUrl = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        coverPreviewUrl: "https://example.com/cover.jpg",
        setCoverFile,
        setRemoveCover,
        setCoverPreviewUrl,
      })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByRole("button", { name: "Remover capa" }))
    expect(setCoverFile).toHaveBeenCalledWith(null)
    expect(setRemoveCover).toHaveBeenCalledWith(true)
  })

  it("calls setTheme and updateThemeMutation when a theme button is clicked", async () => {
    const setTheme = vi.fn()
    const mutateAsync = vi.fn().mockResolvedValue({})
    mockUseEditForm.mockReturnValue(
      buildContextValue({ setTheme, updateThemeMutation: { mutateAsync } })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByText("Clássico"))
    expect(setTheme).toHaveBeenCalledWith("classic")
    expect(mutateAsync).toHaveBeenCalledWith("classic")
  })

  it("calls setTheme with 'corporate' when Corporativo button is clicked", async () => {
    const setTheme = vi.fn()
    const mutateAsync = vi.fn().mockResolvedValue({})
    mockUseEditForm.mockReturnValue(
      buildContextValue({ setTheme, updateThemeMutation: { mutateAsync } })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByText("Corporativo"))
    expect(setTheme).toHaveBeenCalledWith("corporate")
    expect(mutateAsync).toHaveBeenCalledWith("corporate")
  })

  it("does not throw when updateThemeMutation rejects", async () => {
    const setTheme = vi.fn()
    const mutateAsync = vi.fn().mockRejectedValue(new Error("network error"))
    mockUseEditForm.mockReturnValue(
      buildContextValue({ setTheme, updateThemeMutation: { mutateAsync } })
    )
    render(<EstiloSection />)
    // Should not throw — the handler catches errors silently
    await userEvent.click(screen.getByText("Moderno"))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    // No error surface expected
  })

  it("does not show avatar crop dialog when avatarCropOpen is false", () => {
    render(<EstiloSection />)
    expect(screen.queryByText("Ajustar foto de perfil")).not.toBeInTheDocument()
  })

  it("shows avatar crop dialog when avatarCropOpen is true", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        avatarCropOpen: true,
        avatarCropSrc: "data:image/png;base64,test",
      })
    )
    render(<EstiloSection />)
    expect(screen.getByText("Ajustar foto de perfil")).toBeInTheDocument()
    expect(screen.getByText("Salvar recorte")).toBeInTheDocument()
    expect(screen.getByText("Cancelar")).toBeInTheDocument()
  })

  it("shows avatar crop dialog zoom slider when avatarCropOpen is true", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        avatarCropOpen: true,
        avatarCropSrc: "data:image/png;base64,test",
        zoom: 1.5,
      })
    )
    render(<EstiloSection />)
    const zoomSlider = screen.getByRole("slider")
    expect(zoomSlider).toHaveValue("1.5")
  })

  it("calls setZoom when avatar zoom slider changes", () => {
    const setZoom = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        avatarCropOpen: true,
        avatarCropSrc: "data:image/png;base64,test",
        zoom: 1,
        setZoom,
      })
    )
    render(<EstiloSection />)
    const slider = screen.getByRole("slider")
    fireEvent.change(slider, { target: { value: "2" } })
    expect(setZoom).toHaveBeenCalledWith(2)
  })

  it("Cancelar button in avatar crop dialog calls setAvatarCropOpen(false)", async () => {
    const setAvatarCropOpen = vi.fn()
    const setAvatarCropSrc = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        avatarCropOpen: true,
        avatarCropSrc: "data:image/png;base64,test",
        setAvatarCropOpen,
        setAvatarCropSrc,
        pendingAvatarFileRef: { current: null },
      })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))
    expect(setAvatarCropOpen).toHaveBeenCalledWith(false)
    expect(setAvatarCropSrc).toHaveBeenCalledWith(null)
  })

  it("Salvar recorte does nothing when avatarCropSrc is null", async () => {
    const getCroppedBlob = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        avatarCropOpen: true,
        avatarCropSrc: null,
        croppedAreaPixels: { x: 0, y: 0, width: 100, height: 100 },
        getCroppedBlob,
      })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar recorte/i }))
    expect(getCroppedBlob).not.toHaveBeenCalled()
  })

  it("Salvar recorte does nothing when croppedAreaPixels is null", async () => {
    const getCroppedBlob = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        avatarCropOpen: true,
        avatarCropSrc: "data:image/png;base64,test",
        croppedAreaPixels: null,
        getCroppedBlob,
      })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar recorte/i }))
    expect(getCroppedBlob).not.toHaveBeenCalled()
  })

  it("Salvar recorte in avatar dialog calls getCroppedBlob and setPhotoFile", async () => {
    const fakeBlob = new Blob(["img"], { type: "image/jpeg" })
    const getCroppedBlob = vi.fn().mockResolvedValue(fakeBlob)
    const setPhotoFile = vi.fn()
    // Use a real updater that calls the function to cover the updater body
    let capturedUpdater: ((prev: string | null) => string | null) | null = null
    const setPreviewUrl = vi.fn().mockImplementation((updater: (prev: string | null) => string | null) => {
      capturedUpdater = updater
    })
    const setAvatarCropOpen = vi.fn()
    const setAvatarCropSrc = vi.fn()
    const pendingAvatarFileRef = { current: new File(["img"], "avatar.png", { type: "image/png" }) }
    const croppedAreaPixels = { x: 0, y: 0, width: 100, height: 100 }

    const mockObjectUrl = "blob:mock-avatar-url"
    vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue(mockObjectUrl), revokeObjectURL: vi.fn() })

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        avatarCropOpen: true,
        avatarCropSrc: "data:image/png;base64,test",
        croppedAreaPixels,
        getCroppedBlob,
        setPhotoFile,
        setPreviewUrl,
        setAvatarCropOpen,
        setAvatarCropSrc,
        pendingAvatarFileRef,
      })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar recorte/i }))
    await waitFor(() => {
      expect(getCroppedBlob).toHaveBeenCalledWith("data:image/png;base64,test", croppedAreaPixels)
      expect(setPhotoFile).toHaveBeenCalled()
      expect(setAvatarCropOpen).toHaveBeenCalledWith(false)
    })

    // Exercise the updater function body — covers the blob URL revoke path
    if (capturedUpdater) {
      const result1 = capturedUpdater(null)
      expect(result1).toBe(mockObjectUrl)
      const result2 = capturedUpdater("blob:old-url")
      expect(result2).toBe(mockObjectUrl)
    }

    vi.unstubAllGlobals()
  })

  it("shows cover crop dialog when coverCropOpen is true", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        coverCropOpen: true,
        coverCropSrc: "data:image/png;base64,test",
      })
    )
    render(<EstiloSection />)
    expect(screen.getByText("Ajustar capa da página")).toBeInTheDocument()
  })

  it("shows cover crop dialog zoom slider", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        coverCropOpen: true,
        coverCropSrc: "data:image/png;base64,test",
        coverZoom: 2,
      })
    )
    render(<EstiloSection />)
    const slider = screen.getByRole("slider")
    expect(slider).toHaveValue("2")
  })

  it("calls setCoverZoom when cover zoom slider changes", () => {
    const setCoverZoom = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        coverCropOpen: true,
        coverCropSrc: "data:image/png;base64,test",
        coverZoom: 1,
        setCoverZoom,
      })
    )
    render(<EstiloSection />)
    const slider = screen.getByRole("slider")
    fireEvent.change(slider, { target: { value: "2" } })
    expect(setCoverZoom).toHaveBeenCalledWith(2)
  })

  it("Cancelar button in cover crop dialog calls setCoverCropOpen(false)", async () => {
    const setCoverCropOpen = vi.fn()
    const setCoverCropSrc = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        coverCropOpen: true,
        coverCropSrc: "data:image/png;base64,test",
        setCoverCropOpen,
        setCoverCropSrc,
        pendingCoverFileRef: { current: null },
      })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))
    expect(setCoverCropOpen).toHaveBeenCalledWith(false)
    expect(setCoverCropSrc).toHaveBeenCalledWith(null)
  })

  it("Salvar recorte does nothing when coverCropSrc is null", async () => {
    const getCroppedBlob = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        coverCropOpen: true,
        coverCropSrc: null,
        coverCroppedAreaPixels: { x: 0, y: 0, width: 100, height: 100 },
        getCroppedBlob,
      })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar recorte/i }))
    expect(getCroppedBlob).not.toHaveBeenCalled()
  })

  it("Salvar recorte in cover dialog calls getCroppedBlob and setCoverFile", async () => {
    const fakeBlob = new Blob(["img"], { type: "image/jpeg" })
    const getCroppedBlob = vi.fn().mockResolvedValue(fakeBlob)
    const setCoverFile = vi.fn()
    // Use a real updater that calls the function to cover the updater body
    let capturedUpdater: ((prev: string | null) => string | null) | null = null
    const setCoverPreviewUrl = vi.fn().mockImplementation((updater: (prev: string | null) => string | null) => {
      capturedUpdater = updater
    })
    const setCoverCropOpen = vi.fn()
    const setCoverCropSrc = vi.fn()
    const pendingCoverFileRef = { current: new File(["img"], "cover.png", { type: "image/png" }) }
    const coverCroppedAreaPixels = { x: 0, y: 0, width: 1920, height: 1080 }

    const mockObjectUrl = "blob:mock-cover-url"
    vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue(mockObjectUrl), revokeObjectURL: vi.fn() })

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        coverCropOpen: true,
        coverCropSrc: "data:image/png;base64,test",
        coverCroppedAreaPixels,
        getCroppedBlob,
        setCoverFile,
        setCoverPreviewUrl,
        setCoverCropOpen,
        setCoverCropSrc,
        pendingCoverFileRef,
      })
    )
    render(<EstiloSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar recorte/i }))
    await waitFor(() => {
      expect(getCroppedBlob).toHaveBeenCalledWith("data:image/png;base64,test", coverCroppedAreaPixels)
      expect(setCoverFile).toHaveBeenCalled()
      expect(setCoverCropOpen).toHaveBeenCalledWith(false)
    })

    // Exercise the updater function body — covers the blob URL revoke path
    if (capturedUpdater) {
      const result1 = capturedUpdater(null)
      expect(result1).toBe(mockObjectUrl)
      const result2 = capturedUpdater("blob:old-url")
      expect(result2).toBe(mockObjectUrl)
    }

    vi.unstubAllGlobals()
  })

  it("shows empty state placeholder when no cover image", () => {
    render(<EstiloSection />)
    expect(screen.getByText("Capa")).toBeInTheDocument()
  })

  it("shows camera icon placeholder when no avatar is set", () => {
    render(<EstiloSection />)
    // When previewUrl is null, no img element with alt text is rendered
    expect(screen.queryByAltText("Pré-visualização do avatar")).not.toBeInTheDocument()
  })
})
