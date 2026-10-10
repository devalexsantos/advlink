// Easypanel API client: registers lawyers' custom domains on the `web` service so Traefik routes
// them and issues a Let's Encrypt certificate (HTTP challenge).
// Procedures are called as `${EASYPANEL_URL}${EASYPANEL_API_PREFIX}/${procedure}`.

export interface EasypanelApi {
  createDomain(host: string): Promise<{ id: string }>
  findDomainByHost(host: string): Promise<{ id: string } | null>
  deleteDomain(id: string): Promise<void>
}

export class EasypanelError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "EasypanelError"
    this.status = status
  }
}

const TIMEOUT_MS = 15_000

interface EasypanelConfig {
  baseUrl: string
  token: string
  projectName: string
  serviceName: string
  port: number
  certificateResolver: string
}

type DomainLike = { id?: unknown; host?: unknown }

/** Responses may come bare, under `result`, `json` or tRPC's `result.data.json`. */
function unwrap(body: unknown): unknown {
  let cur = body
  for (let i = 0; i < 4; i++) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return cur
    const o = cur as Record<string, unknown>
    if ("id" in o || "host" in o) return o
    const next = o.result ?? o.data ?? o.json
    if (next === undefined) return o
    cur = next
  }
  return cur
}

class HttpEasypanel implements EasypanelApi {
  constructor(private readonly cfg: EasypanelConfig) {}

  private async call(method: "GET" | "POST", procedure: string, input: Record<string, unknown>): Promise<unknown> {
    let url = `${this.cfg.baseUrl}/${procedure}`
    const init: RequestInit = {
      method,
      headers: { Authorization: `Bearer ${this.cfg.token}`, "Content-Type": "application/json", Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    }
    if (method === "GET") {
      const qs = new URLSearchParams(Object.entries(input).map(([k, v]) => [k, String(v)]))
      url += `?${qs}`
    } else {
      init.body = JSON.stringify(input)
    }

    let res: Response
    try {
      res = await fetch(url, init)
    } catch (err) {
      const reason = err instanceof Error && err.name === "TimeoutError" ? "timeout" : "falha de rede"
      throw new EasypanelError(`Easypanel ${procedure}: ${reason}`, 0)
    }
    const text = await res.text()
    if (!res.ok) {
      // Short, token-free message (the body may be large HTML from the panel's proxy)
      throw new EasypanelError(`Easypanel ${procedure}: HTTP ${res.status} ${text.slice(0, 200)}`.trim(), res.status)
    }
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      throw new EasypanelError(`Easypanel ${procedure}: resposta não-JSON`, res.status)
    }
  }

  async createDomain(host: string) {
    const body = await this.call("POST", "createDomain", {
      host,
      https: true,
      path: "/",
      wildcard: false,
      certificateResolver: this.cfg.certificateResolver,
      middlewares: [],
      destinationType: "service",
      serviceDestination: {
        projectName: this.cfg.projectName,
        serviceName: this.cfg.serviceName,
        port: this.cfg.port,
        protocol: "http",
      },
    })
    const domain = unwrap(body) as DomainLike | null
    if (domain && typeof domain.id === "string" && domain.id) return { id: domain.id }
    // Some panel versions return nothing useful on create: look it up
    const found = await this.findDomainByHost(host)
    if (found) return found
    throw new EasypanelError("Easypanel createDomain: resposta sem id", 200)
  }

  async findDomainByHost(host: string) {
    const body = await this.call("GET", "listDomains", {
      projectName: this.cfg.projectName,
      serviceName: this.cfg.serviceName,
    })
    const list = unwrap(body)
    if (!Array.isArray(list)) return null
    const match = (list as DomainLike[]).find(
      (d) => typeof d?.host === "string" && d.host.toLowerCase() === host.toLowerCase() && typeof d.id === "string",
    )
    return match ? { id: match.id as string } : null
  }

  async deleteDomain(id: string) {
    await this.call("POST", "deleteDomain", { id })
  }
}

let cached: EasypanelApi | null | undefined

/** Client from EASYPANEL_* env vars; null when custom domains aren't configured. */
export function getEasypanel(): EasypanelApi | null {
  if (cached !== undefined) return cached
  const url = process.env.EASYPANEL_URL?.trim()
  const token = process.env.EASYPANEL_API_TOKEN?.trim()
  const projectName = process.env.EASYPANEL_PROJECT?.trim()
  const serviceName = process.env.EASYPANEL_SERVICE?.trim()
  if (!url || !token || !projectName || !serviceName) return null

  const prefix = (process.env.EASYPANEL_API_PREFIX?.trim() || "/api").replace(/\/+$/, "")
  const port = Number(process.env.EASYPANEL_SERVICE_PORT || 3000)
  cached = new HttpEasypanel({
    baseUrl: `${url.replace(/\/+$/, "")}${prefix.startsWith("/") ? prefix : `/${prefix}`}`,
    token,
    projectName,
    serviceName,
    port: Number.isFinite(port) && port > 0 ? port : 3000,
    certificateResolver: process.env.EASYPANEL_CERT_RESOLVER?.trim() || "letsencrypt",
  })
  return cached
}

/** Tests only. `undefined` re-reads the env on the next call. */
export function setEasypanelForTests(api: EasypanelApi | null | undefined) {
  cached = api
}
