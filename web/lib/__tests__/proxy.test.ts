// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { getTokenMock } = vi.hoisted(() => ({ getTokenMock: vi.fn() }))
vi.mock("next-auth/jwt", () => ({ getToken: getTokenMock }))

import { proxy } from "@/proxy"
import { NextRequest } from "next/server"

function makeReq(url: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  const u = new URL(url)
  return new NextRequest(url, {
    method: init.method ?? "GET",
    headers: { host: u.host, ...init.headers },
  })
}

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ROOT_DOMAIN = "advlink.site"
    getTokenMock.mockResolvedValue({ sub: "u1" })
  })

  describe("CSRF origin check on /api", () => {
    it("blocks cross-origin POST from a profile subdomain to the app", async () => {
      const res = await proxy(
        makeReq("https://app.advlink.site/api/admin/admins", {
          method: "POST",
          headers: { origin: "https://evil.advlink.site" },
        })
      )
      expect(res.status).toBe(403)
    })

    it("blocks cross-origin PUT from an external site", async () => {
      const res = await proxy(
        makeReq("https://app.advlink.site/api/profile", { method: "PUT", headers: { origin: "https://evil.com" } })
      )
      expect(res.status).toBe(403)
    })

    it("blocks same-site requests without Origin using Fetch Metadata", async () => {
      const res = await proxy(
        makeReq("https://app.advlink.site/api/profile", { method: "POST", headers: { "sec-fetch-site": "same-site" } })
      )
      expect(res.status).toBe(403)
    })

    it("allows same-origin POST", async () => {
      const res = await proxy(
        makeReq("https://app.advlink.site/api/profile", {
          method: "POST",
          headers: { origin: "https://app.advlink.site" },
        })
      )
      expect(res.status).toBe(200)
      expect(res.headers.get("x-middleware-next")).toBe("1")
    })

    it("allows same-origin analytics beacon from a profile subdomain", async () => {
      const res = await proxy(
        makeReq("https://alex.advlink.site/api/analytics/track", {
          method: "POST",
          headers: { origin: "https://alex.advlink.site" },
        })
      )
      expect(res.status).toBe(200)
    })

    it("does not check GET requests", async () => {
      const res = await proxy(
        makeReq("https://app.advlink.site/api/profile", { headers: { origin: "https://evil.com" } })
      )
      expect(res.status).toBe(200)
    })

    it("exempts the payment webhooks and NextAuth", async () => {
      for (const path of ["/api/webhooks/asaas", "/api/auth/signin/email"]) {
        const res = await proxy(
          makeReq(`https://app.advlink.site${path}`, { method: "POST", headers: { origin: "https://evil.com" } })
        )
        expect(res.status).toBe(200)
      }
    })
  })

  describe("/previa/* (shared site preview)", () => {
    it("is public: no login redirect, no rewrite, no CSP nonce", async () => {
      getTokenMock.mockResolvedValue(null)
      const res = await proxy(makeReq("https://app.advlink.site/previa/abcdefghijklmnopqrstuvwxyz012345"))
      expect(res.status).toBe(200)
      expect(res.headers.get("location")).toBeNull()
      expect(res.headers.get("x-middleware-rewrite")).toBeNull()
      expect(res.headers.get("content-security-policy")).toBeNull()
    })
  })

  describe("/adv/* only on the profile subdomain", () => {
    it("redirects app.advlink.site/adv/<slug> to the subdomain", async () => {
      const res = await proxy(
        makeReq("https://app.advlink.site/adv/alex", { headers: { "x-forwarded-proto": "https" } })
      )
      expect(res.status).toBe(301)
      expect(res.headers.get("location")).toBe("https://alex.advlink.site/")
    })

    it("redirects /adv/<slug> requested under another subdomain", async () => {
      const res = await proxy(
        makeReq("https://bob.advlink.site/adv/alex", { headers: { "x-forwarded-proto": "https" } })
      )
      expect(res.headers.get("location")).toBe("https://alex.advlink.site/")
    })

    it("still rewrites the subdomain root to /adv/<slug>", async () => {
      const res = await proxy(makeReq("https://alex.advlink.site/"))
      expect(res.headers.get("x-middleware-rewrite")).toContain("/adv/alex")
    })

    it("rewrites /privacidade on the subdomain to /adv/<slug>/privacidade", async () => {
      const res = await proxy(makeReq("https://alex.advlink.site/privacidade"))
      expect(res.headers.get("x-middleware-rewrite")).toContain("/adv/alex/privacidade")
    })

    it("does not rewrite /privacidade on the app host or reserved subdomains", async () => {
      const res = await proxy(makeReq("https://app.advlink.site/privacidade"))
      expect(res.headers.get("x-middleware-rewrite")).toBeNull()
    })

    it("does not redirect /adv/<slug>/privacidade (reachable outside the subdomain)", async () => {
      const res = await proxy(makeReq("https://app.advlink.site/adv/alex/privacidade"))
      expect(res.status).toBe(200)
      expect(res.headers.get("location")).toBeNull()
    })

    it("leaves /adv alone on hosts outside ROOT_DOMAIN (local dev)", async () => {
      const res = await proxy(makeReq("http://localhost:3000/adv/alex"))
      expect(res.status).toBe(200)
      expect(res.headers.get("location")).toBeNull()
    })
  })

  describe("nonce-based CSP on private areas", () => {
    const nonceOf = (csp: string | null) => csp?.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1]

    it.each(["/login", "/profile/edit", "/profile/account", "/onboarding/profile", "/admin/login"])(
      "sets a nonce CSP on %s and forwards the nonce to the page",
      async (path) => {
        const res = await proxy(makeReq(`https://app.advlink.site${path}`))
        const csp = res.headers.get("content-security-policy")
        const nonce = nonceOf(csp)
        expect(nonce).toBeTruthy()
        expect(csp).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`)
        expect(csp).toContain("frame-ancestors 'none'")
        expect(csp).toContain("object-src 'none'")
        expect(csp).toContain("base-uri 'self'")
        expect(csp).not.toContain("unsafe-inline")
        // Request headers forwarded to the render (Next reads the CSP, layouts read x-nonce)
        expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce)
        expect(res.headers.get("x-middleware-request-content-security-policy")).toBe(csp)
      }
    )

    it("sets it on authenticated admin pages", async () => {
      const { SignJWT } = await import("jose")
      const { getAdminJwtSecret } = await import("@/lib/admin-secret")
      const token = await new SignJWT({ sub: "a1" }).setProtectedHeader({ alg: "HS256" }).sign(getAdminJwtSecret())
      const res = await proxy(makeReq("https://app.advlink.site/admin/users", { headers: { cookie: `admin-token=${token}` } }))
      expect(res.headers.get("x-middleware-next")).toBe("1")
      expect(nonceOf(res.headers.get("content-security-policy"))).toBeTruthy()
    })

    it("generates a fresh nonce per request", async () => {
      const nonces = new Set<string | undefined>()
      for (let i = 0; i < 5; i++) {
        const res = await proxy(makeReq("https://app.advlink.site/login"))
        nonces.add(nonceOf(res.headers.get("content-security-policy")))
      }
      expect(nonces.size).toBe(5)
    })

    it("does not set it on public profiles (subdomain or /adv in local dev)", async () => {
      for (const url of ["https://alex.advlink.site/", "http://localhost:3000/adv/alex"]) {
        const res = await proxy(makeReq(url))
        expect(res.headers.get("content-security-policy")).toBeNull()
        expect(res.headers.get("x-middleware-request-x-nonce")).toBeNull()
      }
    })

    it("does not set it on other public pages or API routes", async () => {
      for (const path of ["/termos-e-privacidade", "/api/profile", "/profilex"]) {
        const res = await proxy(makeReq(`https://app.advlink.site${path}`))
        expect(res.headers.get("content-security-policy")).toBeNull()
      }
    })
  })

  describe("first-touch attribution cookie", () => {
    it("stores UTM params from an app landing", async () => {
      const res = await proxy(makeReq("https://app.advlink.site/login?utm_source=blog&utm_medium=footer"))
      const cookie = res.cookies.get("advlink_attribution")
      expect(cookie).toBeDefined()
      expect(JSON.parse(cookie!.value)).toMatchObject({ utm_source: "blog", utm_medium: "footer", landingPath: "/login" })
    })

    it("keeps the first touch (does not overwrite an existing cookie)", async () => {
      const res = await proxy(
        makeReq("https://app.advlink.site/login?utm_source=google", {
          headers: { cookie: 'advlink_attribution={"utm_source":"blog"}' },
        })
      )
      expect(res.cookies.get("advlink_attribution")).toBeUndefined()
    })

    it("keeps the attribution when an anonymous visitor is redirected to login", async () => {
      getTokenMock.mockResolvedValue(null)
      const res = await proxy(makeReq("https://app.advlink.site/profile/edit?utm_source=email"))
      expect(res.status).toBe(307)
      expect(JSON.parse(res.cookies.get("advlink_attribution")!.value)).toMatchObject({ utm_source: "email" })
    })

    it("does not set a cookie without UTM or external referrer", async () => {
      const res = await proxy(makeReq("https://app.advlink.site/login"))
      expect(res.cookies.get("advlink_attribution")).toBeUndefined()
    })
  })
})
