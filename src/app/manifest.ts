import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Srishti Workout",
    short_name: "Workout",
    description: "Your coach-led, science-based training plan.",
    start_url: "/home",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f4",
    theme_color: "#c8435a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
