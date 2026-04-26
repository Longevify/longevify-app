import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.longevify.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const publicPaths = ["/", "/login", "/signup", "/planos"];
  return publicPaths.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1.0 : 0.7,
  }));
}
