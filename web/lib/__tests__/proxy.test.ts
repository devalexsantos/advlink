// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { getTokenMock, prismaMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  prismaMock: { customDomain: { findUnique: vi.fn(), findFirst: vi.fn() } },
}))
vi.mock("next-auth/jwt", () => ({ getToken: getTokenMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { proxy } from "@/proxy"
import { clearCustomHostCache } from "@/lib/custom-domain"
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
    prismaMock.customDomain.findUnique.mockResolvedValue(null)
    prismaMock.customDomain.findFirst.mockResolvedValue(null)
    clearCustomHostCache()
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

    it("rewrites /artigos and /artigos/<slug> on the subdomain", async () => {
      const list = await proxy(makeReq("https://alex.advlink.site/artigos"))
      expect(list.headers.get("x-middleware-rewrite")).toContain("/adv/alex/artigos")
      const one = await proxy(makeReq("https://alex.advlink.site/artigos/meu-artigo-1"))
      expect(one.headers.get("x-middleware-rewrite")).toContain("/adv/alex/artigos/meu-artigo-1")
    })

    it("does not rewrite invalid article paths or the app host", async () => {
      for (const u of ["https://alex.advlink.site/artigos/Bad_Slug", "https://alex.advlink.site/artigos/a/b", "https://app.advlink.site/artigos"]) {
        const res = await proxy(makeReq(u))
        expect(res.headers.get("x-middleware-rewrite")).toBeNull()
      }
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

    it("sends anonymous visitors to login with a relative callbackUrl (not the container origin)", async () => {
      getTokenMock.mockResolvedValue(null)
      const res = await proxy(makeReq("http://0.0.0.0:80/profile/analytics?range=30", { headers: { host: "app.advlink.site" } }))
      const location = new URL(res.headers.get("location")!)
      expect(location.pathname).toBe("/login")
      expect(location.searchParams.get("callbackUrl")).toBe("/profile/analytics?range=30")
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

  describe("custom domains (lawyer's own domain)", () => {
    function knownDomain(status = "active") {
      prismaMock.customDomain.findUnique.mockResolvedValue({ status, profileId: "p1", profile: { slug: "joao" } })
    }

    it("answers 404 on unknown hosts, for every path", async () => {
      for (const path of ["/", "/login", "/api/profile", "/admin"]) {
        const res = await proxy(makeReq(`https://desconhecido.com.br${path}`))
        expect(res.status).toBe(404)
      }
      expect(prismaMock.customDomain.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { host: "desconhecido.com.br" } }),
      )
    })

    it("rewrites the public pages to the site and tags them with the site id", async () => {
      knownDomain()
      const cases: Array<[string, string]> = [
        ["/", "/adv/joao"],
        ["/privacidade", "/adv/joao/privacidade"],
        ["/artigos", "/adv/joao/artigos"],
        ["/artigos/meu-artigo", "/adv/joao/artigos/meu-artigo"],
      ]
      for (const [path, target] of cases) {
        const res = await proxy(makeReq(`https://escritorio.adv.br${path}`))
        expect(new URL(res.headers.get("x-middleware-rewrite")!).pathname).toBe(target)
        expect(res.headers.get("x-advlink-site")).toBe("p1")
        expect(res.headers.get("content-security-policy")).toBeNull()
      }
    })

    it("also serves provisioning domains (needed for the HTTPS check)", async () => {
      knownDomain("provisioning")
      const res = await proxy(makeReq("https://escritorio.adv.br/"))
      expect(res.headers.get("x-advlink-site")).toBe("p1")
    })

    it("does not serve pending domains", async () => {
      knownDomain("pending_dns")
      expect((await proxy(makeReq("https://escritorio.adv.br/"))).status).toBe(404)
    })

    it("answers 404 for app pages, admin, /adv and other APIs (no auth gate)", async () => {
      knownDomain()
      getTokenMock.mockResolvedValue(null)
      for (const path of ["/login", "/profile/edit", "/admin", "/admin/login", "/adv/joao", "/onboarding/profile", "/api/profile", "/api/admin/users", "/artigos/Bad_Slug"]) {
        const res = await proxy(makeReq(`https://escritorio.adv.br${path}`))
        expect(res.status).toBe(404)
        expect(res.headers.get("location")).toBeNull()
      }
      expect(getTokenMock).not.toHaveBeenCalled()
    })

    it("lets the page-view beacon, the contact form and static assets through", async () => {
      knownDomain()
      for (const path of ["/api/analytics/track", "/api/leads"]) {
        const res = await proxy(
          makeReq(`https://escritorio.adv.br${path}`, { method: "POST", headers: { origin: "https://escritorio.adv.br" } }),
        )
        expect(res.headers.get("x-middleware-next")).toBe("1")
      }
      for (const path of ["/_next/static/chunks/a.js", "/logo.png", "/favicon.ico"]) {
        const res = await proxy(makeReq(`https://escritorio.adv.br${path}`))
        expect(res.headers.get("x-middleware-next")).toBe("1")
      }
    })

    it("still blocks cross-origin POSTs to the allowed APIs", async () => {
      knownDomain()
      const res = await proxy(
        makeReq("https://escritorio.adv.br/api/leads", { method: "POST", headers: { origin: "https://evil.com" } }),
      )
      expect(res.status).toBe(403)
    })

    it("ignores the port and case of the Host header", async () => {
      knownDomain()
      const res = await proxy(makeReq("https://escritorio.adv.br/", { headers: { host: "Escritorio.ADV.br:443" } }))
      expect(res.headers.get("x-advlink-site")).toBe("p1")
      expect(prismaMock.customDomain.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { host: "escritorio.adv.br" } }),
      )
    })

    it("answers 503 when the lookup fails", async () => {
      prismaMock.customDomain.findUnique.mockRejectedValue(new Error("db down"))
      expect((await proxy(makeReq("https://escritorio.adv.br/"))).status).toBe(503)
    })

    it("redirects the subdomain pages to the active custom domain (301, keeps path and query)", async () => {
      prismaMock.customDomain.findFirst.mockResolvedValue({ host: "escritorio.adv.br" })
      const res = await proxy(makeReq("https://joao.advlink.site/artigos/x?utm_source=ig"))
      expect(res.status).toBe(301)
      expect(res.headers.get("location")).toBe("https://escritorio.adv.br/artigos/x?utm_source=ig")
      expect(prismaMock.customDomain.findFirst).toHaveBeenCalledWith({
        where: { status: "active", profile: { slug: "joao" } },
        select: { host: true },
      })
    })

    it("does not redirect subdomain APIs or sites without an active domain", async () => {
      prismaMock.customDomain.findFirst.mockResolvedValue({ host: "escritorio.adv.br" })
      const api = await proxy(makeReq("https://joao.advlink.site/api/analytics/track"))
      expect(api.status).toBe(200)
      expect(api.headers.get("location")).toBeNull()

      clearCustomHostCache()
      prismaMock.customDomain.findFirst.mockResolvedValue(null)
      const page = await proxy(makeReq("https://maria.advlink.site/"))
      expect(page.headers.get("x-middleware-rewrite")).toContain("/adv/maria")
    })

    it("never treats the app or reserved subdomains as custom hosts", async () => {
      const res = await proxy(makeReq("https://app.advlink.site/login"))
      expect(res.status).toBe(200)
      expect(prismaMock.customDomain.findUnique).not.toHaveBeenCalled()
      expect(prismaMock.customDomain.findFirst).not.toHaveBeenCalled()
    })
  })

  describe("local dev hosts keep working", () => {
    it("ROOT_DOMAIN=localhost:3000: app on localhost, profiles on <slug>.localhost", async () => {
      process.env.ROOT_DOMAIN = "localhost:3000"
      const sub = await proxy(makeReq("http://novo-alex.localhost:3000/"))
      expect(sub.headers.get("x-middleware-rewrite")).toContain("/adv/novo-alex")

      getTokenMock.mockResolvedValue(null)
      const app = await proxy(makeReq("http://localhost:3000/profile/edit"))
      expect(app.status).toBe(307)
      expect(new URL(app.headers.get("location")!).pathname).toBe("/login")
      expect(prismaMock.customDomain.findUnique).not.toHaveBeenCalled()
    })

    it("treats IPs, *.localhost and DEV_ALLOWED_ORIGINS as platform hosts", async () => {
      process.env.DEV_ALLOWED_ORIGINS = "*.trycloudflare.com, tunnel.example.dev"
      try {
        for (const url of [
          "http://127.0.0.1:3000/login",
          "http://foo.localhost:3000/login",
          "https://abc.trycloudflare.com/login",
          "https://tunnel.example.dev/login",
        ]) {
          const res = await proxy(makeReq(url))
          expect(res.status).toBe(200)
        }
        expect(prismaMock.customDomain.findUnique).not.toHaveBeenCalled()
      } finally {
        delete process.env.DEV_ALLOWED_ORIGINS
      }
    })
  })
})
