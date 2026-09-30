import { ImageResponse } from "next/og";
import { THEME_COLOR } from "./theme";

const SIZES = [192, 512];

export function generateImageMetadata() {
  return SIZES.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

// Full-bleed background with the ring inside the central 60%, so the same
// image works as a maskable icon.
export default async function Icon({ id }: { id: Promise<string | number> }) {
  const size = Number(await id);
  const ring = size * 0.6;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: THEME_COLOR,
        }}
      >
        <div
          style={{
            width: ring,
            height: ring,
            borderRadius: "50%",
            border: `${size * 0.07}px solid white`,
            borderRightColor: "rgba(255,255,255,0.3)",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
