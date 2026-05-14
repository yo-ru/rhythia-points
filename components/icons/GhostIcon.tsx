export function GhostIcon({ size = 22 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mods/mod_ghost.png"
      width={size}
      height={size}
      alt=""
      draggable={false}
      className="mod-icon-png pointer-events-none select-none"
    />
  );
}
