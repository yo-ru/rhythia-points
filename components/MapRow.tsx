"use client";

import { useState } from "react";
import type { MapRow as MapRowData } from "@/lib/queries";
import { formatLength, formatStars, relativeDate } from "@/lib/format";
import { HardrockIcon } from "@/components/icons/HardrockIcon";
import { GhostIcon } from "@/components/icons/GhostIcon";
import { SpeedIcon } from "@/components/icons/SpeedIcon";
import { MapRowActions } from "@/components/MapRowActions";

export function MapRow({ row }: { row: MapRowData }) {
  const mapUrl = row.map.pageId != null
    ? `https://www.rhythia.com/maps/${row.map.pageId}`
    : null;
  return (
    <>
      <MobileRow row={row} mapUrl={mapUrl} />
      <DesktopRow row={row} mapUrl={mapUrl} />
    </>
  );
}

function DesktopRow({ row, mapUrl }: { row: MapRowData; mapUrl: string | null }) {
  const { map, variant } = row;
  const effectiveLength = map.length != null ? Math.round(map.length / variant.speed) : null;
  return (
    <div className="group relative maps-grid bg-bg-elev border border-line hover:border-line/80 hover:bg-bg-row rounded-lg overflow-hidden transition-colors min-h-[60px] hidden md:grid">
      <Cover title={map.title} image={map.image} />

      <div className="min-w-0 py-1.5 px-2 flex items-center gap-3">
        <div className="min-w-0">
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-bright font-medium text-base truncate block"
            >
              {map.title}
            </a>
          ) : (
            <span className="text-accent font-medium text-base truncate block">
              {map.title}
            </span>
          )}
          <div className="text-sm text-text-muted truncate">
            {map.mapper && (
              <>by <span className="text-text-dim">{map.mapper.username}</span>{" · "}</>
            )}
            updated: <span className="text-text-dim">{relativeDate(map.rankedAt)}</span>
            {map.noteCount != null && (
              <>{" · "}notes: <span className="text-text-dim">{map.noteCount.toLocaleString()}</span></>
            )}
          </div>
        </div>
        <MapRowActions pageId={map.pageId} beatmapFile={map.beatmapFile} />
      </div>

      <div className="text-center whitespace-nowrap">
        <span className="font-mono text-2xl text-text leading-none">
          {Math.round(variant.avgRp).toLocaleString()}
        </span>
        <span className="text-text-muted text-sm font-normal ml-0.5">rp</span>
      </div>

      <SpeedSlot speed={variant.speed} />
      <ModSlot kind="hr" on={variant.hardrock} />
      <ModSlot kind="gh" on={variant.ghost} />

      <div className="flex justify-center">
        <Pill kind={lenKind(effectiveLength)}>{formatLength(effectiveLength)}</Pill>
      </div>
      <div className="flex justify-center">
        <Pill kind={starKind(map.starRating)}>{formatStars(map.starRating)}</Pill>
      </div>

      <div
        className="text-center font-mono text-base text-accent"
        title={`overweightness: ${variant.overweightness.toFixed(4)}`}
      >
        {(variant.overweightness * 100).toFixed(1)}
      </div>

      <div
        className="font-mono text-sm text-text-dim text-right pr-5"
        title={`${variant.sampleCount} player${variant.sampleCount === 1 ? "" : "s"} have this in their top 100`}
      >
        {variant.sampleCount.toLocaleString()}
      </div>

    </div>
  );
}

function MobileRow({ row, mapUrl }: { row: MapRowData; mapUrl: string | null }) {
  const { map, variant } = row;
  const effectiveLength = map.length != null ? Math.round(map.length / variant.speed) : null;
  return (
    <div className="md:hidden bg-bg-elev border border-line rounded-lg overflow-hidden flex">
      <Cover title={map.title} image={map.image} mobile />
      <div className="flex-1 min-w-0 p-2.5 flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-bright font-medium text-sm truncate block leading-tight"
              >
                {map.title}
              </a>
            ) : (
              <span className="text-accent font-medium text-sm truncate block leading-tight">
                {map.title}
              </span>
            )}
          </div>
          <MapRowActions pageId={map.pageId} beatmapFile={map.beatmapFile} />
        </div>

        <div className="text-xs text-text-muted truncate">
          {map.mapper && <>by <span className="text-text-dim">{map.mapper.username}</span> · </>}
          <span className="text-text-dim">{relativeDate(map.rankedAt)}</span>
          {map.noteCount != null && (
            <> · <span className="text-text-dim">{map.noteCount.toLocaleString()}</span> notes</>
          )}
        </div>

        <div className="flex items-baseline gap-3 font-mono">
          <span className="text-text">
            <span className="text-lg font-semibold leading-none">
              {Math.round(variant.avgRp).toLocaleString()}
            </span>
            <span className="text-text-muted text-xs ml-0.5">rp</span>
          </span>
          <span className="text-accent" title={`overweightness: ${variant.overweightness.toFixed(4)}`}>
            <span className="text-base font-semibold leading-none">
              {(variant.overweightness * 100).toFixed(1)}
            </span>
            <span className="text-text-muted text-xs ml-0.5">ow</span>
          </span>
          <span
            className="ml-auto text-xs text-text-muted"
            title={`${variant.sampleCount} player${variant.sampleCount === 1 ? "" : "s"} have this in their top 100`}
          >
            {variant.sampleCount} plays
          </span>
        </div>

        <div className="flex items-center gap-1">
          <SpeedSlot speed={variant.speed} compact />
          <ModSlot kind="hr" on={variant.hardrock} compact />
          <ModSlot kind="gh" on={variant.ghost} compact />
          <span className="ml-1 inline-flex gap-1">
            <Pill kind={lenKind(effectiveLength)} compact>{formatLength(effectiveLength)}</Pill>
            <Pill kind={starKind(map.starRating)} compact>{formatStars(map.starRating)}</Pill>
          </span>
        </div>
      </div>
    </div>
  );
}

function Cover({
  title,
  image,
  mobile = false,
}: {
  title: string;
  image: string | null;
  mobile?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  const safeUrl = image && !failed ? encodeURI(image) : null;
  const fallbackStyle = {
    background: `linear-gradient(135deg, hsl(${hue} 50% 28%) 0%, hsl(${(hue + 40) % 360} 40% 18%) 100%)`,
  };
  const wrapper = mobile
    ? "w-24 self-stretch shrink-0 relative overflow-hidden flex items-end p-1.5 text-[10px] font-mono text-white/40 select-none"
    : "self-stretch relative overflow-hidden flex items-end p-2 text-xs font-mono text-white/40 select-none";
  return (
    <div className={wrapper} style={fallbackStyle}>
      {safeUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeUrl}
          alt=""
          onError={() => setFailed(true)}
          draggable={false}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
      )}
      {!safeUrl && (
        <span className="relative truncate">{title.slice(0, 3).toUpperCase()}</span>
      )}
    </div>
  );
}

function SpeedSlot({ speed, compact = false }: { speed: number; compact?: boolean }) {
  const on = speed !== 1;
  return (
    <span
      className={`mod-badge mod-speed ${on ? "is-on" : ""} pointer-events-none justify-self-center`}
      style={compact ? { width: 36, height: 30 } : undefined}
    >
      <span className="flex items-center justify-center">
        <SpeedIcon speed={speed} size={compact ? 18 : 22} />
      </span>
    </span>
  );
}

function ModSlot({ kind, on, compact = false }: { kind: "hr" | "gh"; on: boolean; compact?: boolean }) {
  const Icon = kind === "hr" ? HardrockIcon : GhostIcon;
  return (
    <span
      className={`mod-badge mod-${kind} ${on ? "is-on" : ""} pointer-events-none justify-self-center`}
      style={compact ? { width: 36, height: 30 } : undefined}
    >
      <span className="flex items-center justify-center">
        <Icon size={compact ? 18 : 22} />
      </span>
    </span>
  );
}

function Pill({ kind, compact = false, children }: { kind: PillKind; compact?: boolean; children: React.ReactNode }) {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center px-2 h-6 rounded text-xs font-mono ${PILL_CLASS[kind]}`}
      >
        {children}
      </span>
    );
  }
  return <span className={`pill ${PILL_CLASS[kind]}`}>{children}</span>;
}

type PillKind =
  | "lenShort" | "lenMed" | "lenLong" | "lenXLong"
  | "starsEz" | "starsNm" | "starsHd" | "starsIn" | "starsEx" | "starsXe";

const PILL_CLASS: Record<PillKind, string> = {
  lenShort:  "bg-len-short/30 text-len-short border border-len-short/40",
  lenMed:    "bg-len-med/30 text-len-med border border-len-med/40",
  lenLong:   "bg-len-long/30 text-len-long border border-len-long/40",
  lenXLong:  "bg-len-xlong/30 text-len-xlong border border-len-xlong/40",
  starsEz:   "bg-stars-ez/20 text-stars-ez border border-stars-ez/40",
  starsNm:   "bg-stars-nm/20 text-stars-nm border border-stars-nm/40",
  starsHd:   "bg-stars-hd/20 text-stars-hd border border-stars-hd/40",
  starsIn:   "bg-stars-in/20 text-stars-in border border-stars-in/40",
  starsEx:   "bg-stars-ex/20 text-stars-ex border border-stars-ex/40",
  starsXe:   "bg-stars-xe/20 text-stars-xe border border-stars-xe/40",
};

function lenKind(seconds: number | null): PillKind {
  if (seconds == null) return "lenMed";
  if (seconds < 90) return "lenShort";
  if (seconds < 180) return "lenMed";
  if (seconds < 300) return "lenLong";
  return "lenXLong";
}

function starKind(stars: number | null): PillKind {
  if (stars == null) return "starsNm";
  if (stars < 4)  return "starsEz";
  if (stars < 6)  return "starsNm";
  if (stars < 8)  return "starsHd";
  if (stars < 10) return "starsIn";
  if (stars < 12) return "starsEx";
  return "starsXe";
}
