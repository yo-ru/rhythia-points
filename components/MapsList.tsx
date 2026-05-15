"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MapRow as MapRowData } from "@/lib/queries";
import type { MapsFilters } from "@/lib/types";
import { loadMoreMaps } from "@/app/maps/actions";
import { MapRow } from "./MapRow";
import { MapGridCard } from "./MapGridCard";

export function MapsList({
  initialRows,
  initialPage,
  total,
  filters,
}: {
  initialRows: MapRowData[];
  initialPage: number;
  total: number;
  filters: MapsFilters;
}) {
  const sp = useSearchParams();
  const view = sp.get("view") === "grid" ? "grid" : "detailed";

  const [rows, setRows] = useState<MapRowData[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const pageRef = useRef(initialPage);
  const totalRef = useRef(total);
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { totalRef.current = total; }, [total]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    let active = true;

    const obs = new IntersectionObserver(
      async (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (loadingRef.current) return;
        if (rowsRef.current.length >= totalRef.current) return;

        loadingRef.current = true;
        setLoading(true);
        setError(null);
        try {
          const next = await loadMoreMaps(filtersRef.current, pageRef.current + 1);
          if (!active) return;
          await Promise.all(
            next.rows.map((r) =>
              r.map.image ? preloadImage(r.map.image) : Promise.resolve(),
            ),
          );
          if (!active) return;
          pageRef.current = next.page;
          setRows((prev) => {
            const merged = [...prev, ...next.rows];
            rowsRef.current = merged;
            return merged;
          });
        } catch (err) {
          if (active) setError((err as Error).message);
        } finally {
          loadingRef.current = false;
          if (active) setLoading(false);
        }
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(el);
    return () => {
      active = false;
      obs.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowsRef = useRef<MapRowData[]>(initialRows);

  const hasMore = rows.length < total;

  if (rows.length === 0) {
    return (
      <div className="bg-bg-elev border border-white/10 rounded-xl p-10 text-center text-white/65">
        No maps match these filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {view === "detailed" && <DetailedHeader />}

      {view === "grid" && (
        <div className="hidden md:grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((row) => (
            <MapGridCard key={`${row.map.legacyMapId}-${row.variant.id}`} row={row} />
          ))}
        </div>
      )}

      <div className={view === "grid" ? "md:hidden space-y-2" : "space-y-2"}>
        {rows.map((row) => (
          <MapRow key={`${row.map.legacyMapId}-${row.variant.id}`} row={row} />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex items-center justify-center text-white/55 text-xs">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner /> loading more…
            </span>
          ) : (
            <span>{rows.length} / {total} loaded</span>
          )}
        </div>
      )}

      {!hasMore && (
        <div className="text-center py-6 text-xs text-white/55">
          end of results · {total} maps
        </div>
      )}

      {error && (
        <div className="text-center py-2 text-xs text-red-400">
          load error: {error}
        </div>
      )}
    </div>
  );
}

function DetailedHeader() {
  return (
    <div className="maps-grid bg-bg-elev border border-white/10 rounded-xl py-3 text-white/55 hidden md:grid">
      <div />
      <div />
      <div className="flex items-center justify-center" title="RP">
        <TrophyHeaderIcon />
      </div>
      <div className="flex items-center justify-center col-span-3" title="Mods">
        <ModsHeaderIcon />
      </div>
      <div className="flex items-center justify-center" title="Length">
        <ClockHeaderIcon />
      </div>
      <div className="flex items-center justify-center" title="Stars">
        <StarHeaderIcon />
      </div>
      <div className="flex items-center justify-center" title="Overweightness">
        <ScaleHeaderIcon />
      </div>
      <div className="flex items-center justify-center" title="Plays">
        <PeopleHeaderIcon />
      </div>
    </div>
  );
}

function TrophyHeaderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function ModsHeaderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function ClockHeaderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function StarHeaderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ScaleHeaderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function PeopleHeaderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const safe = encodeURI(src);
    const img = new globalThis.Image();
    const timer = setTimeout(() => resolve(), 4000);
    const done = () => { clearTimeout(timer); resolve(); };
    img.onload = done;
    img.onerror = done;
    img.src = safe;
  });
}
