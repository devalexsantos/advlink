// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { handlerMock } = vi.hoisted(() => ({
  handlerMock: vi.fn(),
}))

vi.mock("next-auth", () => ({ default: () => handlerMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))

import { GET, POST } from "@/app/api/auth/[...nextauth]/route"
import { resetRateLimiters } from "@/lib/rate-limit"

function ctx(...segments: string[]) {
  return { params: Promise.resolve({ nextauth: segments }) }
}

function formReq(path: string, fields: Record<string, string>, ip = "1.2.3.4") {
  return new NextRequest(`http://localhost/api/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "x-real-ip": ip },
    body: new URLSearchParams(fields).toString(),
  })
}

describe("/api/auth/[...nextauth]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimiters()
    handlerMock.mockImplementation(async (req: NextRequest) => {
      // NextAuth must still be able to read the original body.
      const body = await req.text()
      return Response.json({ url: "http://localhost/api/auth/verify-request", body })
    })
  })

  it("exports the NextAuth handler as GET", () => {
    expect(GET).toBe(handlerMock)
  })

  it("passes magic-link requests through with the body intact", async () => {
    const res = await POST(formReq("signin/email", { email: "a@test.com", csrfToken: "t", json: "true" }), ctx("signin", "email"))
    expect(res.status).toBe(200)
    expect(handlerMock).toHaveBeenCalledTimes(1)
    expect((await res.json()).body).toContain("email=a%40test.com")
  })

  it("returns 429 after 5 magic links to the same address within the window (email bombing)", async () => {
    for (let i = 0; i < 5; i++) {
      const ip = `10.0.0.${i}`
      expect((await POST(formReq("signin/email", { email: "victim@test.com" }, ip), ctx("signin", "email"))).status).toBe(200)
    }
    const res = await POST(formReq("signin/email", { email: " Victim@Test.com" }, "10.0.0.99"), ctx("signin", "email"))
    expect(res.status).toBe(429)
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0)
    const data = await res.json()
    expect(data.error).toMatch(/Muitas tentativas/)
    // next-auth/react signIn() parses `url` and reads ?error= from it.
    expect(new URL(data.url).searchParams.get("error")).toBe("TooManyRequests")
    expect(handlerMock).toHaveBeenCalledTimes(5)
  })

  it("returns 429 after 20 magic links from the same IP to different addresses", async () => {
    for (let i = 0; i < 20; i++) {
      await POST(formReq("signin/email", { email: `u${i}@test.com` }), ctx("signin", "email"))
    }
    const res = await POST(formReq("signin/email", { email: "new@test.com" }), ctx("signin", "email"))
    expect(res.status).toBe(429)
    expect(handlerMock).toHaveBeenCalledTimes(20)
  })

  it("returns 429 on credentials brute force (10 attempts per IP+email)", async () => {
    for (let i = 0; i < 10; i++) {
      await POST(formReq("callback/credentials", { email: "a@test.com", password: `p${i}` }), ctx("callback", "credentials"))
    }
    const res = await POST(formReq("callback/credentials", { email: "a@test.com", password: "x" }), ctx("callback", "credentials"))
    expect(res.status).toBe(429)
    expect(handlerMock).toHaveBeenCalledTimes(10)
  })

  it("does not rate limit other NextAuth POSTs (e.g. signout)", async () => {
    for (let i = 0; i < 30; i++) {
      expect((await POST(formReq("signout", { csrfToken: "t" }), ctx("signout"))).status).toBe(200)
    }
  })
})
