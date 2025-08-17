import { CheckCircle2, Scale, ShieldCheck, Zap, Rocket } from "lucide-react"

const benefits = [
  { title: "IA que escreve por você", desc: "Gere descrições profissionais das áreas de atuação com um clique.", icon: <CheckCircle2 className="h-6 w-6 text-blue-300" /> },
  { title: "Design pensado para advogados", desc: "Layout sóbrio, moderno e com alta legibilidade, focado em conversão.", icon: <Scale className="h-6 w-6 text-blue-300" /> },
  { title: "Configuração em minutos", desc: "Sem código. Customize cores, texto e contatos rapidamente.", icon: <Zap className="h-6 w-6 text-blue-300" /> },
  { title: "Responsivo e rápido", desc: "Performance e SEO prontos para você ser encontrado.", icon: <Rocket className="h-6 w-6 text-blue-300" /> },
  { title: "Confiável e seguro", desc: "Base moderna com boas práticas de segurança e acessibilidade.", icon: <ShieldCheck className="h-6 w-6 text-blue-300" /> },
  { title: "Integrações fáceis", desc: "WhatsApp, e-mail e telefone integrados na sua página.", icon: <CheckCircle2 className="h-6 w-6 text-blue-300" /> },
] as const

export function Benefits() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="mb-10 text-center">
        <h2 className="text-3xl md:text-4xl font-bold">Por que criar sua landing page aqui?</h2>
        <p className="mt-3 text-blue-100/80">Benefícios pensados para o dia a dia da advocacia moderna</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((b) => (
          <div key={b.title} className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-b from-blue-900/30 to-blue-900/10 p-6 hover:border-blue-400/40 transition">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition"/>
            <div className="mb-3 text-blue-300">{b.icon}</div>
            <h3 className="text-xl font-semibold">{b.title}</h3>
            <p className="mt-2 text-sm text-blue-100/80">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}


