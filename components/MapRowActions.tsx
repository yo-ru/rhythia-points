"use client";

import { useState } from "react";

export function MapRowActions({
  mapId,
  beatmapFile,
}: {
  mapId: number | null;
  beatmapFile: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (mapId == null) return;
    try {
      await navigator.clipboard.writeText(String(mapId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore (non-secure context)
    }
  }

  return (
    <div className="flex flex-row md:flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity shrink-0">
      <button
        type="button"
        onClick={copy}
        disabled={mapId == null}
        title={copied ? "Copied!" : mapId != null ? `Copy map id (${mapId})` : "No map id"}
        className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/85 hover:bg-black/60 hover:text-white disabled:opacity-30"
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
      {beatmapFile ? (
        <a
          href={beatmapFile}
          download
          target="_blank"
          rel="noopener noreferrer"
          title="Download .sspm"
          className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/85 hover:bg-black/60 hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}
