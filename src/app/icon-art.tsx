import { ICON_BACKGROUND, ICON_FAST, ICON_SLOW } from "./theme";

const BARS = [ICON_FAST, ICON_SLOW, ICON_FAST, ICON_SLOW];

// Full-bleed background with a fast/slow profile inside the central 60%, so
// the same image works as a maskable icon.
export function IconArt({ size }: { size: number }) {
  const area = size * 0.6;
  const gap = size * 0.04;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ICON_BACKGROUND,
      }}
    >
      <div
        style={{
          width: area,
          height: area * 0.7,
          display: "flex",
          alignItems: "flex-end",
          gap,
        }}
      >
        {BARS.map((color, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: color === ICON_FAST ? "100%" : "40%",
              background: color,
              borderRadius: size * 0.02,
            }}
          />
        ))}
      </div>
    </div>
  );
}
