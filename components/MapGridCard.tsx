"use client";

import { useState } from "react";
import type { MapRow as MapRowData } from "@/lib/queries";
import { formatLength } from "@/lib/format";
import { HardrockIcon } from "@/components/icons/HardrockIcon";
import { GhostIcon } from "@/components/icons/GhostIcon";
import { SpeedIcon } from "@/components/icons/SpeedIcon";
import { usePlayer } from "@/components/MapPlayer";

function getStarColor(stars: number) {
  const start = [34, 197, 94];
  const end = [168, 85, 247];
  const t = Math.max(0, Math.min(1, stars / 12));
  const r = Math.round(start[0]! + (end[0]! - start[0]!) * t);
  const g = Math.round(start[1]! + (end[1]! - start[1]!) * t);
  const b = Math.round(start[2]! + (end[2]! - start[2]!) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getDifficultyConfig(difficulty: number | null): {
  label: string;
  bg: string;
  border: string;
} | null {
  if (difficulty == null) return null;
  const map: Record<number, { label: string; bg: string; border: string }> = {
    0: { label: "N/A",      bg: "bg-neutral-700/65", border: "border-neutral-400/55" },
    1: { label: "EASY",     bg: "bg-green-600/65",   border: "border-green-400/55" },
    2: { label: "MEDIUM",   bg: "bg-yellow-500/65",  border: "border-yellow-400/55" },
    3: { label: "HARD",     bg: "bg-red-600/65",     border: "border-red-400/55" },
    5: { label: "TASUKETE", bg: "bg-neutral-800/65", border: "border-neutral-400/55" },
  };
  return map[difficulty] ?? { label: "LOGIC", bg: "bg-purple-600/65", border: "border-purple-400/55" };
}

export function MapGridCard({ row }: { row: MapRowData }) {
  const { map, variant } = row;
  const mapUrl = map.mapId != null
    ? `https://www.rhythia.com/maps/${map.mapId}`
    : null;
  const playerUrl = map.mapper != null
    ? `https://www.rhythia.com/player/${map.mapper.id}`
    : null;
  const effectiveLength = map.length != null ? Math.round(map.length / variant.speed) : null;
  const stars = map.starRating ?? 0;
  const starColor = getStarColor(stars);
  const diff = getDifficultyConfig(map.difficulty);
  const trackId = `${map.legacyMapId}|${variant.id}`;
  const owPct = (variant.overweightness * 100).toFixed(1);
  const hasAudio = map.hasAudio === true && map.mapId != null;

  const audio = usePlayer();
  const isActiveTrack = audio.track?.id === trackId;
  const isPlayingThis = isActiveTrack && audio.playing;

  function onPlayClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!hasAudio || map.mapId == null) return;
    audio.play({
      id: trackId,
      title: map.title,
      mapper: map.mapper?.username ?? null,
      cover: map.image,
      src: `/api/audio/${map.mapId}`,
      speed: variant.speed,
      hardrock: variant.hardrock,
      ghost: variant.ghost,
      previewMapId: map.mapId,
    });
  }

  return (
    <div className="group flex grow flex-col overflow-hidden rounded-xl border border-white/10 bg-bg-elev text-sm text-white transition hover:bg-bg-row">
      <Cover
        image={map.image}
        title={map.title}
        owPct={owPct}
        diff={diff}
        stars={stars}
        starColor={starColor}
        length={effectiveLength}
        plays={variant.sampleCount}
        url={mapUrl}
      />
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white/40 leading-tight">Mapped by</div>
          {playerUrl && map.mapper ? (
            <a
              href={playerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block min-w-0 truncate text-sm font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              {map.mapper.username}
            </a>
          ) : (
            <span className="mt-1 block min-w-0 truncate text-sm text-white/60">No mapper</span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center justify-end gap-2 h-7">
            <span className="inline-flex items-center justify-center w-7 h-7">
              <SpeedIcon speed={variant.speed} size={26} />
            </span>
            <span className={`inline-flex items-center justify-center w-7 h-7 ${variant.hardrock ? "" : "opacity-25"}`}>
              <HardrockIcon size={26} />
            </span>
            <span className={`inline-flex items-center justify-center w-7 h-7 ${variant.ghost ? "" : "opacity-25"}`}>
              <GhostIcon size={26} />
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 h-7 text-white/65">
            {hasAudio && (
              <button
                type="button"
                onClick={onPlayClick}
                aria-label={isPlayingThis ? "Pause preview" : "Play preview"}
                title={isPlayingThis ? "Pause preview" : "Play preview"}
                className="inline-flex items-center justify-center w-7 h-7 transition hover:text-white"
              >
                {isPlayingThis ? <PauseSmallIcon /> : <PlaySmallIcon />}
              </button>
            )}
            <CopyMapIdButton mapId={map.mapId} />
            {map.beatmapFile && (
              <a
                href={map.beatmapFile}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-7 h-7 transition hover:text-white"
                title="Download .sspm"
              >
                <DownloadIcon />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Cover({
  image,
  title,
  owPct,
  diff,
  stars,
  starColor,
  length,
  plays,
  url,
}: {
  image: string | null;
  title: string;
  owPct: string;
  diff: { label: string; bg: string; border: string } | null;
  stars: number;
  starColor: string;
  length: number | null;
  plays: number;
  url: string | null;
}) {
  const [failed, setFailed] = useState(false);

  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  const safeUrl = image && !failed ? encodeURI(image) : null;

  return (
    <div className="relative h-40 w-full overflow-hidden border-b border-white/10">
      {safeUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeUrl}
          alt=""
          onError={() => setFailed(true)}
          draggable={false}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-50 transition duration-300 group-hover:scale-[1.02] group-hover:opacity-60"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, hsl(${hue} 50% 28%) 0%, hsl(${(hue + 40) % 360} 40% 18%) 100%)`,
          }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-bg-elev via-bg-elev/40 to-transparent" />

      <div className="absolute left-2 top-2 z-20 flex flex-col items-start gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/55 bg-blue-600/65 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          <ScaleIcon className="h-4 w-4" />
          {owPct}
        </span>
        {diff && (
          <span className={`inline-flex items-center gap-1.5 rounded-full border ${diff.bg} ${diff.border} px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.25)]`}>
            <StarFilledIcon className="h-[13px] w-[13px]" />
            {diff.label}
          </span>
        )}
      </div>

      <div className="absolute right-2 top-2 flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-sm backdrop-blur-sm">
          <span className="font-extrabold" style={{ color: starColor }}>
            {stars > 0 ? stars.toFixed(2) : "—"}
          </span>
          <StarLineIcon className="h-4 w-4" style={{ color: starColor }} />
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-sm text-white/85 backdrop-blur-sm">
          <span>{formatLength(length)}</span>
          <ClockIcon className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-sm text-white/85 backdrop-blur-sm">
          <span>{plays}</span>
          <PeopleIcon className="h-4 w-4" />
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block min-w-0"
          >
            <div className="line-clamp-2 text-lg font-bold leading-tight text-white">
              {title}
            </div>
          </a>
        ) : (
          <div className="min-w-0">
            <div className="line-clamp-2 text-lg font-bold leading-tight text-white">
              {title}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyMapIdButton({ mapId }: { mapId: number | null }) {
  const [copied, setCopied] = useState(false);
  async function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (mapId == null) return;
    try {
      await navigator.clipboard.writeText(String(mapId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }
  if (mapId == null) return null;
  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied!" : `Copy map id (${mapId})`}
      className="inline-flex items-center justify-center w-7 h-7 transition hover:text-white"
    >
      {copied ? <CheckIcon /> : <PlusIcon />}
    </button>
  );
}

function ScaleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3v18" />
      <path d="M8 21h8" />
      <path d="M5 7h14" />
      <path d="M5 7l-3 6" />
      <path d="M5 7l3 6" />
      <path d="M2 13a3 3 0 0 0 6 0" />
      <path d="M19 7l-3 6" />
      <path d="M19 7l3 6" />
      <path d="M16 13a3 3 0 0 0 6 0" />
    </svg>
  );
}

function StarFilledIcon({ className }: { className?: string }) {
  return (
    <svg stroke="currentColor" fill="currentColor" strokeWidth={0} viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
    </svg>
  );
}

function StarLineIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PlaySmallIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseSmallIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg stroke="currentColor" fill="currentColor" strokeWidth={0} viewBox="0 0 512 512" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg stroke="currentColor" fill="currentColor" strokeWidth={0} viewBox="0 0 448 512" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
