const ICON_BY_SPEED: Record<string, string> = {
  "0.75": "/mods/mod_75.png",
  "0.8":  "/mods/mod_80.png",
  "0.87": "/mods/mod_87.png",
  "1.15": "/mods/mod_15.png",
  "1.25": "/mods/mod_25.png",
  "1.35": "/mods/mod_35.png",
  "1.45": "/mods/mod_45.png",
};

export function speedIconUrl(speed: number): string | null {
  const key = String(speed);
  return ICON_BY_SPEED[key] ?? null;
}

export function SpeedIcon({ speed, size = 22 }: { speed: number; size?: number }) {
  const url = speedIconUrl(speed);
  if (!url) {
    return (
      <span
        className="inline-flex items-center justify-center select-none mod-nm-text"
        style={{ width: size, height: size }}
      >
        <span
          style={{
            fontFamily: "var(--font-display), ui-sans-serif, sans-serif",
            fontSize: Math.round(size * 0.52),
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          NM
        </span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      width={size}
      height={size}
      alt=""
      draggable={false}
      className="mod-icon-png pointer-events-none select-none"
    />
  );
}
