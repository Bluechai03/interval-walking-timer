import type { MetadataRoute } from "next";
import { THEME_COLOR } from "./theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Interval Walking Timer",
    short_name: "Walking Timer",
    description: "Alternate fast and slow walking intervals with audio cues.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
