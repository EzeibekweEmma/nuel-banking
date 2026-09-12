import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return [
    { route: "/", priority: 1 },
    { route: "/login", priority: 0.7 },
    { route: "/register", priority: 0.7 },
    { route: "/forgot-password", priority: 0.4 },
  ].map(({ route, priority }) => ({
    url: new URL(route, siteUrl).toString(),
    changeFrequency: "monthly" as const,
    priority,
  }));
}
