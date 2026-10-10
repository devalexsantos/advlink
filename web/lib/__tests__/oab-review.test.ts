import { describe, it, expect } from "vitest"
import { reviewText } from "../oab-review"

const rules = (s: string) => reviewText(s).map((f) => f.rule)

describe("reviewText", () => {
  it.each([
    ["Advogado especialista em Direito Civil", "especialista"],
    ["Advogada especializada em família", "especialista"],
    ["Garantimos o resultado", "promessa-de-resultado"],
    ["Causa ganha para você", "promessa-de-resultado"],
    ["Sucesso garantido", "promessa-de-resultado"],
    ["Resultado garantido na sua ação", "promessa-de-resultado"],
    ["Garantia de êxito", "promessa-de-resultado"],
    ["Atuação com 100% de êxito", "promessa-de-resultado"],
    ["Primeira consulta gratuita", "honorarios-gratuidade"],
    ["Parcelamos seus honorários", "honorarios-gratuidade"],
    ["Desconto para novos clientes", "honorarios-gratuidade"],
    ["Honorários a partir de R$ 500", "honorarios-gratuidade"],
    ["Somos o melhor escritório", "superioridade"],
    ["Os melhores advogados", "superioridade"],
    ["Escritório líder em tributário", "superioridade"],
    ["Número 1 do Brasil", "superioridade"],
    ["Nº 1 em consumidor", "superioridade"],
    ["Referência em direito do trabalho", "superioridade"],
    ["Ligue agora!", "captacao"],
    ["Não perca tempo", "captacao"],
    ["Contrate já", "captacao"],
    ["Processo 0001234-56.2020.8.26.0100 ganho", "numero-de-processo"],
  ])("detecta %s", (text, rule) => {
    expect(rules(text)).toContain(rule)
  })

  it("não dispara em texto informativo limpo", () => {
    expect(reviewText("Atuação em Direito Civil, de Família e Sucessões, com atendimento em São Paulo.")).toEqual([])
  })

  it("não dispara em linguagem jurídica com 'garantia'", () => {
    expect(
      reviewText("As garantias fundamentais e a garantia de emprego são direitos garantidos por lei."),
    ).toEqual([])
  })

  it("não dispara em 'melhorar' nem 'especialidade'", () => {
    expect(reviewText("Podemos melhorar sua compreensão sobre a especialidade do caso.")).toEqual([])
  })

  it("remove HTML e decodifica entidades", () => {
    const f = reviewText("<p>Somos <strong>especialista</strong>&nbsp;em&nbsp;civil</p>")
    expect(f.map((x) => x.rule)).toEqual(["especialista"])
    expect(reviewText('<p class="garantia">texto neutro</p>')).toEqual([])
  })

  it("ignora acentos e caixa", () => {
    expect(rules("LÍDER de mercado")).toContain("superioridade")
    expect(rules("PROMOÇÃO imperdível")).toContain("honorarios-gratuidade")
  })

  it("deduplica por regra e termo", () => {
    expect(reviewText("especialista, ESPECIALISTA e Especialista")).toHaveLength(1)
  })

  it("retorna vazio para entrada vazia", () => {
    expect(reviewText("")).toEqual([])
  })
})
