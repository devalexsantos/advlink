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
    ["No seu caso, o prazo é de dois anos", "caso-concreto"],
    ["Analisamos seu caso em 24 horas", "caso-concreto"],
    ["Análise do seu caso sem compromisso", "caso-concreto"],
    ["Conte-nos sobre o seu caso", "caso-concreto"],
  ])("detecta %s", (text, rule) => {
    expect(rules(text)).toContain(rule)
  })

  it("caso-concreto: usa o termo mais específico e explica a vedação", () => {
    const [finding] = reviewText("Analisamos seu caso")
    expect(finding).toMatchObject({ rule: "caso-concreto", term: "analisamos seu caso" })
    expect(finding.message).toMatch(/art\. 42, I/)
    expect(reviewText("NO SEU CASO")[0]).toMatchObject({ rule: "caso-concreto", term: "no seu caso" })
  })

  it("caso-concreto: não dispara em textos gerais sobre casos", () => {
    expect(rules("Em casos de divórcio consensual, o procedimento pode ser feito em cartório.")).not.toContain("caso-concreto")
    expect(rules("O caso fortuito e a força maior afastam a responsabilidade.")).not.toContain("caso-concreto")
    expect(rules("Cada caso tem suas particularidades.")).not.toContain("caso-concreto")
    expect(rules("Ele mencionou o seu casaco.")).not.toContain("caso-concreto")
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
