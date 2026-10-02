import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL || "https://example.com";
  const routes = ["", "/dashboard", "/build", "/ide", "/email", "/domains", "/voice", "/search", "/account"];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
  }));
}
