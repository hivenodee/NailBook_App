import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nailbook.app";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const providers = await prisma.provider.findMany({
    where: {
      booksOpen: true,
      services: {
        some: {
          isActive: true,
        },
      },
    },
    select: {
      slug: true,
      updatedAt: true,
    },
  });

  const providerPages: MetadataRoute.Sitemap = providers.flatMap(
    (provider) => [
      {
        url: `${baseUrl}/${provider.slug}`,
        lastModified: provider.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      {
        url: `${baseUrl}/${provider.slug}/reviews`,
        lastModified: provider.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      },
    ]
  );

  return [...staticPages, ...providerPages];
}
