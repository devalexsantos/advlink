import { vi } from "vitest"

export const stripeMock = {
  customers: {
    create: vi.fn().mockResolvedValue({ id: "cus_test123" }),
    retrieve: vi.fn(),
    list: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        id: "cs_test123",
        url: "https://checkout.stripe.com/test",
      }),
    },
  },
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
}

vi.mock("@/lib/stripe", () => ({
  stripe: stripeMock,
}))
