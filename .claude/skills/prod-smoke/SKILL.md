---
name: prod-smoke
description: Smoke test somente-leitura da produção do AdvLink (app, landing, blog, perfil público por subdomínio, robots/sitemap, headers de segurança, 404). Use após deploy, antes de divulgar, ou quando o usuário perguntar se a produção está no ar.
---

# prod-smoke

Somente requisições GET/HEAD. Nunca faça login, POST ou crie dados em produção.

```bash
for u in https://advlink.site https://app.advlink.site/login https://blog.advlink.site \
         https://advlink.site/robots.txt https://advlink.site/sitemap.xml \
         https://blog.advlink.site/sitemap.xml https://app.advlink.site/robots.txt; do
  printf "%-45s " "$u"; curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" -L "$u"
done
```

Perfil público (peça ao usuário um slug ativo; `teste` é o demo usado pela LP):
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://teste.advlink.site/
curl -s -o /dev/null -w "%{http_code}\n" https://slug-que-nao-existe-123.advlink.site/   # esperado 404
curl -s https://teste.advlink.site/ | grep -Eo '<(title|link rel="canonical"|meta property="og:[a-z]+")[^>]*>'
```

Headers de segurança:
```bash
curl -sI https://app.advlink.site/login | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy'
curl -sI https://advlink.site | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy'
```

TLS: `echo | openssl s_client -connect app.advlink.site:443 -servername app.advlink.site 2>/dev/null | openssl x509 -noout -enddate`

## Relatório
Tabela: verificação · esperado · obtido · ✅/❌. Destaque regressões (5xx, 200 em slug inexistente, ausência de HSTS, certificado vencendo em < 20 dias).
