---
name: blog-post
description: Cria um post novo no blog do AdvLink (blog/content/blog/*.mdx) com frontmatter correto, SEO on-page e conformidade OAB. Use quando o usuário pedir artigo, post, pauta ou conteúdo para o blog.
---

# blog-post

1. Delegue a redação ao agent `legal-content-writer` (tom, OAB, estrutura). Para pauta/palavra-chave, consulte o `seo-growth`.
2. Confira os slugs existentes: `ls blog/content/blog/` — não repita tema sem diferenciar.
3. Crie `blog/content/blog/<slug>.mdx`:
   ```mdx
   ---
   title: "..."
   description: "... (≤160 caracteres)"
   date: "AAAA-MM-DD"
   slug: "<slug>"
   author: "Equipe AdvLink"
   tags: ["...", "..."]
   coverImage: "/images/<slug>.png"
   ---
   ```
4. Capa: `blog/public/images/<slug>.png`. Se não houver imagem, avise o usuário (não aponte para arquivo inexistente).
5. Links internos para 1–3 posts existentes e CTA final para `https://app.advlink.site` com UTM `?utm_source=blog&utm_medium=post&utm_campaign=<slug>`.
6. Valide: `cd blog && npm run build` (o post precisa aparecer no sitemap gerado por `blog/app/sitemap.ts`).
