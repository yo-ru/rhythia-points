const ICON_BY_SPEED: Record<string, string> = {
  "0.75": "/mods/modspeedminusminusminus.png",
  "0.8":  "/mods/modspeedminusminus.png",
  "0.87": "/mods/modspeedminus.png",
  "1":    "/mods/modspeed.png",
  "1.0":  "/mods/modspeed.png",
  "1.15": "/mods/modspeedplus.png",
  "1.25": "/mods/modspeedplusplus.png",
  "1.35": "/mods/modspeedplusplusplus.png",
  "1.45": "/mods/modspeedplusplusplusplus.png",
};

export function speedIconUrl(speed: number): string {
  const key = String(speed);
  return ICON_BY_SPEED[key] ?? "/mods/modspeed.png";
}

export function SpeedIcon({ speed, size = 36 }: { speed: number; size?: number }) {
  const url = speedIconUrl(speed);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      width={size}
      height={size}
      alt=""
      draggable={false}
      className="pointer-events-none select-none object-contain"
    />
  );
}
