import type { MetadataRoute } from "next";
import { absoluteUrl } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pro/*", "/annuaire", "/annuaire/*"],
      disallow: ["/dashboard/*", "/settings/*", "/api/*", "/sign-in", "/sign-up"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
