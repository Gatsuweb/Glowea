import type { MetadataRoute } from "next";
import { absoluteUrl } from "../lib/seo";
import prisma from "../lib/prisma";
import { getSubscriptionAccessFromTenant } from "../lib/subscription";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await prisma.publicProfile.findMany({
    where: {
      isPublished: true,
    },
    select: {
      slug: true,
      updatedAt: true,
      Tenant: {
        select: {
          subscriptionPlan: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          Subscription: {
            select: {
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

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

  for (const profile of profiles) {
    if (!getSubscriptionAccessFromTenant(profile.Tenant).canUsePublicPage) {
      continue;
    }

    urls.push({
      url: absoluteUrl(`/pro/${profile.slug}`),
      lastModified: profile.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  return urls;
}
