import { ImageResponse } from "next/og";
import { IconArt } from "./icon-art";

const SIZES = [192, 512];

export function generateImageMetadata() {
  return SIZES.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const size = Number(await id);

  return new ImageResponse(<IconArt size={size} />, {
    width: size,
    height: size,
  });
}
