import type { MetadataRoute } from "next";
import { absoluteUrl } from "../lib/seo";
import { getDirectoryCitiesFromProfiles, getDirectoryProfiles } from "../lib/directory";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await getDirectoryProfiles();
  const cities = getDirectoryCitiesFromProfiles(profiles);
  const directoryLastModified = profiles.reduce<Date | null>((latest, profile) => {
    if (!latest || profile.updatedAt > latest) return profile.updatedAt;
    return latest;
  }, null);

  const urls: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/politique-de-confidentialite"),
      lastModified: new Date("2026-06-30"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/conditions-utilisation"),
      lastModified: new Date("2026-06-30"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/suppression-donnees"),
      lastModified: new Date("2026-06-30"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  if (directoryLastModified) {
    urls.push({
      url: absoluteUrl("/annuaire"),
      lastModified: directoryLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const city of cities) {
    urls.push({
      url: absoluteUrl(`/annuaire/${city.slug}`),
      lastModified: city.updatedAt,
      changeFrequency: "weekly",
      priority: 0.65,
    });
  }

  for (const profile of profiles) {
    urls.push({
      url: absoluteUrl(`/pro/${profile.slug}`),
      lastModified: profile.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  return urls;
}
