import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/forgot-password"],
      disallow: [
        "/admin",
        "/beneficiaries",
        "/dashboard",
        "/funding",
        "/notifications",
        "/profile",
        "/reset-password",
        "/transactions",
        "/transfer",
        "/verify-email",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl.origin,
  };
}
