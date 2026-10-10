// In-memory Easypanel for tests.
import type { EasypanelApi } from "./easypanel"

export class FakeEasypanel implements EasypanelApi {
  seq = 0
  domains: Record<string, { id: string; host: string }> = {}
  calls: string[] = []
  /** Set to make the next call throw. */
  failNext: Error | null = null

  private maybeFail() {
    if (this.failNext) {
      const err = this.failNext
      this.failNext = null
      throw err
    }
  }

  async createDomain(host: string) {
    this.calls.push(`createDomain:${host}`)
    this.maybeFail()
    this.seq++
    const id = `dom_fake${String(this.seq).padStart(4, "0")}`
    this.domains[id] = { id, host }
    return { id }
  }

  async findDomainByHost(host: string) {
    this.calls.push(`findDomainByHost:${host}`)
    this.maybeFail()
    const d = Object.values(this.domains).find((x) => x.host === host)
    return d ? { id: d.id } : null
  }

  async deleteDomain(id: string) {
    this.calls.push(`deleteDomain:${id}`)
    this.maybeFail()
    delete this.domains[id]
  }
}
