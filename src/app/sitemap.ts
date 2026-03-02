import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wattleos.au";
  const now = new Date();

  const marketingPages = [
    { path: "/", changeFrequency: "monthly" as const, priority: 1.0 },
    {
      path: "/wattleos/curriculum",
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      path: "/wattleos/for-guides",
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      path: "/wattleos/for-parents",
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      path: "/wattleos/for-staff",
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      path: "/wattleos/for-admin",
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ];

  const legalPages = [
    {
      path: "/legal/privacy",
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      path: "/legal/terms",
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      path: "/legal/data-processing",
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];

  return [...marketingPages, ...legalPages].map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
