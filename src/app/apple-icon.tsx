import { ImageResponse } from "next/og";
import { THEME_COLOR } from "./theme";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 108,
            height: 108,
            borderRadius: "50%",
            border: "13px solid white",
            borderRightColor: "rgba(255,255,255,0.3)",
          }}
        />
      </div>
    ),
    size,
  );
}
