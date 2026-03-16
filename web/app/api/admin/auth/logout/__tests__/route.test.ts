import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/admin-auth", () => ({ ADMIN_COOKIE: "admin-token" }))

import { POST } from "@/app/api/admin/auth/logout/route"

describe("POST /api/admin/auth/logout", () => {
  it("returns ok and clears the admin cookie", async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)

    const setCookie = res.headers.get("set-cookie")
    expect(setCookie).toContain("admin-token=")
    expect(setCookie).toContain("Max-Age=0")
  })
})
