import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wattleos.au";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/wattleos/", "/legal/"],
        disallow: [
          "/admin/",
          "/dashboard",
          "/api/",
          "/settings",
          "/tenant-picker",
          "/auth/",
          "/pedagogy/",
          "/students",
          "/attendance",
          "/reports",
          "/comms",
          "/classes",
          "/incidents",
          "/medication",
          "/excursions",
          "/superadmin/",
          "/enroll",
          "/inquiry",
          "/invite/",
          "/tours",
          "/setup/",
          "/parent/",
          "/timesheets",
          "/portal/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
