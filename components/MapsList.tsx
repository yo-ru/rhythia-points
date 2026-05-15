"use client";

import { useEffect, useRef, useState } from "react";
import type { MapRow as MapRowData } from "@/lib/queries";
import type { MapsFilters } from "@/lib/types";
import { loadMoreMaps } from "@/app/maps/actions";
import { MapRow } from "./MapRow";

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
      <div className="bg-bg-elev border border-line rounded-lg p-10 text-center text-text-dim">
        No maps match these filters.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {rows.map((row) => (
        <MapRow key={`${row.map.legacyMapId}-${row.variant.id}`} row={row} />
      ))}

      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex items-center justify-center text-text-muted text-xs">
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
        <div className="text-center py-6 text-xs text-text-muted">
          end of results · {total} maps
        </div>
      )}

      {error && (
        <div className="text-center py-2 text-xs text-rose">
          load error: {error}
        </div>
      )}
    </div>
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
