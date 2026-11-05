import { THEME_COLOR } from "../../../theme";

// A separate manifest so the test page installs as its own Home Screen app and opens itself,
// not the timer. Throwaway, like the rest of /lab/lock-test.
export function GET() {
  return Response.json(
    {
      name: "Lock-screen test",
      short_name: "Lock test",
      start_url: "/lab/lock-test",
      scope: "/lab/lock-test",
      display: "standalone",
      orientation: "portrait",
      background_color: THEME_COLOR,
      theme_color: THEME_COLOR,
      icons: [
        { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
