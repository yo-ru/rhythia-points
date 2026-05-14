export function formatRp(n: number): string {
  return n >= 1000
    ? `${(n / 1000).toFixed(1)}k`
    : n.toFixed(n >= 100 ? 0 : 1);
}

export function formatLength(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatStars(stars: number | null): string {
  return stars == null ? "—" : `${stars.toFixed(2)}★`;
}

export function formatBpm(bpm: number | null): string {
  return bpm == null ? "—" : Math.round(bpm).toString();
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const days = ms / (1000 * 60 * 60 * 24);
  if (days < 1) return "today";
  if (days < 2) return "1d ago";
  if (days < 30) return `${Math.floor(days)}d ago`;
  const months = days / 30;
  if (months < 12) return `${Math.floor(months)}mo ago`;
  return `${(months / 12).toFixed(1)}y ago`;
}

export function modBadge(mod: { speed: number; hardrock: boolean; ghost: boolean }): string {
  const parts: string[] = [];
  if (mod.speed !== 1) parts.push(`${mod.speed}x`);
  if (mod.hardrock) parts.push("HR");
  if (mod.ghost) parts.push("GH");
  return parts.length ? parts.join(" ") : "NM";
}
