import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nuel Bank",
    short_name: "Nuel",
    description:
      "Secure digital banking with intelligent fraud monitoring and clear control over your money.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6f4",
    theme_color: "#092d24",
    orientation: "portrait-primary",
    categories: ["finance", "business"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
