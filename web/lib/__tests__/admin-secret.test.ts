import { describe, it, expect, vi, afterEach } from "vitest"

async function load() {
  vi.resetModules()
  return (await import("@/lib/admin-secret")).getAdminJwtSecret
}

describe("getAdminJwtSecret()", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("throws in production when the secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_JWT_SECRET", "")
    const get = await load()
    expect(() => get()).toThrow(/ADMIN_JWT_SECRET/)
  })

  it("throws in production when the secret is too short", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_JWT_SECRET", "short-secret")
    const get = await load()
    expect(() => get()).toThrow(/32/)
  })

  it("never accepts the old hardcoded fallback in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_JWT_SECRET", "admin-secret-change-me")
    const get = await load()
    expect(() => get()).toThrow()
  })

  it("returns the configured secret in production", async () => {
    const secret = "x".repeat(40)
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_JWT_SECRET", secret)
    const get = await load()
    expect(new TextDecoder().decode(get())).toBe(secret)
  })

  it("uses a dev fallback outside production", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("ADMIN_JWT_SECRET", "")
    const get = await load()
    expect(get().length).toBeGreaterThan(0)
  })
})
