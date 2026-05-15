export function GhostIcon({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mods/mod_ghost.png"
      width={size}
      height={size}
      alt=""
      draggable={false}
      className="pointer-events-none select-none object-contain"
    />
  );
}
