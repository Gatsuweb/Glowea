const FALLBACK_SITE_URL = "https://glowea.app";

function normalizeSiteUrl(value: string | undefined) {
  const raw = value?.trim();
  const fallback = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : FALLBACK_SITE_URL;
  const withProtocol = raw
    ? raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `https://${raw}`
    : fallback;

  return withProtocol.replace(/\/+$/, "");
}

export function getSiteUrl() {
  return new URL(normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL));
}

export function absoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}
