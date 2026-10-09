export const SITE_URL = "https://blog.advlink.site";
export const SITE_NAME = "Blog AdvLink";
export const SITE_DESCRIPTION =
  "Marketing Jurídico e Presença Digital para Advogados. Dicas práticas para atrair mais clientes e fortalecer sua marca na advocacia.";
export const ADVLINK_URL = "https://advlink.site";
export const APP_URL = "https://app.advlink.site";

/** Adds UTM params so sign-ups coming from the blog are attributed to it (utm_source=blog). */
export function withUtm(url: string, medium: string, campaign?: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "blog");
  u.searchParams.set("utm_medium", medium);
  if (campaign) u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}
