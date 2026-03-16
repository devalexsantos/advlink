import { vi } from "vitest"

export const mockSession = {
  user: {
    id: "user-1",
    userId: "user-1",
    email: "test@example.com",
    name: "Test User",
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
}

export const getServerSessionMock = vi.fn().mockResolvedValue(mockSession)

vi.mock("next-auth", () => ({
  default: vi.fn(),
  getServerSession: getServerSessionMock,
}))

vi.mock("@/auth", () => ({
  authOptions: {},
}))
