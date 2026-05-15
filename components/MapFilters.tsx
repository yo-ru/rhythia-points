"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DATE_WINDOWS, MAPS_SORT_OPTIONS, SPEED_OPTIONS } from "@/lib/types";
import { HardrockIcon } from "@/components/icons/HardrockIcon";
import { GhostIcon } from "@/components/icons/GhostIcon";
import { SpeedIcon } from "@/components/icons/SpeedIcon";
import { ModFilterPopover } from "@/components/ModFilterPopover";

function TextFilter({
  value,
  onCommit,
  debounceMs = 250,
  ...rest
}: {
  value: string;
  onCommit: (v: string) => void;
  debounceMs?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(onCommit);
  useEffect(() => {
    commitRef.current = onCommit;
  });
  useEffect(() => {
    setLocal(value);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, [value]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <input
      {...rest}
      value={local}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => commitRef.current(v), debounceMs);
      }}
    />
  );
}

type Tri = "any" | "on" | "off";
const TRI_ORDER: Tri[] = ["any", "on", "off"];

function urlToTri(v: string | null): Tri {
  if (v === "1" || v === "true") return "on";
  if (v === "0" || v === "false") return "off";
  return "any";
}
function triToUrl(t: Tri): string | null {
  if (t === "on") return "1";
  if (t === "off") return "0";
  return null;
}
function nextTri(t: Tri): Tri {
  const i = TRI_ORDER.indexOf(t);
  return TRI_ORDER[(i + 1) % TRI_ORDER.length]!;
}

type SpeedState = "any" | number;
const SPEED_ORDER: SpeedState[] = ["any", ...SPEED_OPTIONS];

function urlToSpeed(v: string | null): SpeedState {
  if (v == null || v === "") return "any";
  const n = Number(v);
  return SPEED_OPTIONS.includes(n as (typeof SPEED_OPTIONS)[number]) ? n : "any";
}
function speedToUrl(s: SpeedState): string | null {
  return s === "any" ? null : String(s);
}
function nextSpeed(s: SpeedState): SpeedState {
  const i = SPEED_ORDER.indexOf(s);
  return SPEED_ORDER[(i + 1) % SPEED_ORDER.length]!;
}

const NUMERIC_RANGE_KEYS = new Set([
  "rpMin", "rpMax", "lenMin", "lenMax", "starMin", "starMax",
]);

export function MapFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [showExtra, setShowExtra] = useState(false);

  const current = useMemo(
    () => ({
      window: sp.get("window") ?? "all",
      q: sp.get("q") ?? "",
      rpMin: sp.get("rpMin") ?? "",
      rpMax: sp.get("rpMax") ?? "",
      speed: urlToSpeed(sp.get("speed")),
      hr: urlToTri(sp.get("hr")),
      gh: urlToTri(sp.get("gh")),
      lenMin: sp.get("lenMin") ?? "",
      lenMax: sp.get("lenMax") ?? "",
      starMin: sp.get("starMin") ?? "",
      starMax: sp.get("starMax") ?? "",
      sort: sp.get("sort") ?? "farm",
    }),
    [sp],
  );

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        const isEmpty = v === null || v === "";
        const isZeroNumeric = NUMERIC_RANGE_KEYS.has(k) && v === "0";
        if (isEmpty || isZeroNumeric) next.delete(k);
        else next.set(k, v as string);
      }
      next.delete("page");
      startTransition(() => router.push(`${pathname}?${next.toString()}`));
    },
    [router, pathname, sp],
  );

  const hasAny =
    current.q || current.rpMin || current.rpMax || current.speed !== "any" ||
    current.hr !== "any" || current.gh !== "any" ||
    current.lenMin || current.lenMax ||
    current.starMin || current.starMax || (current.window && current.window !== "all");

  return (
    <>
      <div className="md:hidden bg-bg-elev border border-line rounded-lg p-3 flex flex-col gap-2.5 text-sm">
        <div className="flex gap-2 items-center">
          <button
            className="inline-flex items-center justify-center h-9 w-9 rounded border border-rose/40 text-rose hover:bg-rose/10 disabled:opacity-30 disabled:hover:bg-transparent shrink-0"
            disabled={!hasAny}
            onClick={() => startTransition(() => router.push(pathname))}
            title="Reset filters"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </button>
          <TextFilter
            type="text"
            placeholder="song name…"
            className="flex-1 min-w-0 text-base py-1.5 px-2 bg-bg-elev border border-line rounded placeholder:text-text-muted focus:outline-none focus:border-accent"
            value={current.q}
            onCommit={(v) => update({ q: v })}
          />
        </div>
        <div className="flex items-center gap-2">
          <ModFilterPopover<string>
            trigger={
              <SpeedBadge
                speed={current.speed}
                onClick={() => update({ speed: speedToUrl(nextSpeed(current.speed)) })}
              />
            }
            options={SPEED_ORDER.map((s) => (s === "any" ? "any" : String(s)))}
            onSelect={(v) => update({ speed: v === "any" ? null : v })}
            renderOption={(v) => (
              <SpeedBadge
                speed={v === "any" ? "any" : (Number(v) as SpeedState)}
                active={v === "any" ? current.speed === "any" : current.speed === Number(v)}
              />
            )}
          />
          <div className="justify-self-center"><ModBadge kind="hr" tri="any" disabled /></div>
          <div className="justify-self-center"><ModBadge kind="gh" tri="any" disabled /></div>
        </div>
        <MobileRangeRow
          label="RP"
          minVal={current.rpMin} maxVal={current.rpMax}
          onMin={(v) => update({ rpMin: v })} onMax={(v) => update({ rpMax: v })}
        />
        <MobileTimeRow
          minSec={current.lenMin} maxSec={current.lenMax}
          onMin={(v) => update({ lenMin: v })} onMax={(v) => update({ lenMax: v })}
        />
        <MobileRangeRow
          label="★" step="0.01"
          minVal={current.starMin} maxVal={current.starMax}
          onMin={(v) => update({ starMin: v })} onMax={(v) => update({ starMax: v })}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-text-muted">sort</span>
            <select
              className="text-sm py-1.5"
              value={current.sort}
              onChange={(e) => update({ sort: e.target.value === "farm" ? null : e.target.value })}
            >
              {MAPS_SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-text-muted">updated</span>
            <select
              className="text-sm py-1.5"
              value={current.window}
              onChange={(e) => update({ window: e.target.value === "all" ? null : e.target.value })}
            >
              {DATE_WINDOWS.map((w) => (
                <option key={w.key} value={w.key}>{w.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

    <div className="hidden md:block bg-bg-elev border border-line rounded-lg overflow-visible text-sm">
      <div className="maps-grid py-2">
        <div className="flex flex-col gap-1 pl-3 pr-1">
          <button
            className="inline-flex items-center justify-center gap-1 h-7 rounded border border-rose/40 text-rose text-xs hover:bg-rose/10 disabled:opacity-30 disabled:hover:bg-transparent"
            disabled={!hasAny}
            onClick={() => startTransition(() => router.push(pathname))}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            reset
          </button>
          <button
            className="inline-flex items-center justify-center gap-1 h-7 rounded border border-line hover:border-accent text-text-dim hover:text-accent text-xs"
            onClick={() => setShowExtra((v) => !v)}
          >
            <svg
              width="11" height="11" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showExtra ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            {showExtra ? "less" : "more"}
          </button>
        </div>

        <TextFilter
          type="text"
          placeholder="song name…"
          className="w-full text-base py-1.5 px-2 bg-bg-elev border border-line rounded
                     placeholder:text-text-muted focus:outline-none focus:border-accent"
          value={current.q}
          onCommit={(v) => update({ q: v })}
        />

        <FilterPair label="RP"
          minVal={current.rpMin} maxVal={current.rpMax}
          onMin={(v) => update({ rpMin: v })} onMax={(v) => update({ rpMax: v })} />

        <ModFilterPopover<string>
          trigger={
            <SpeedBadge
              speed={current.speed}
              onClick={() => update({ speed: speedToUrl(nextSpeed(current.speed)) })}
            />
          }
          options={SPEED_ORDER.map((s) => (s === "any" ? "any" : String(s)))}
          onSelect={(v) =>
            update({ speed: v === "any" ? null : v })
          }
          renderOption={(v) => (
            <SpeedBadge
              speed={v === "any" ? "any" : Number(v) as SpeedState}
              active={
                v === "any"
                  ? current.speed === "any"
                  : current.speed === Number(v)
              }
            />
          )}
        />

        {/* HR + GH disabled until upstream actually ranks them. */}
        <div className="justify-self-center"><ModBadge kind="hr" tri="any" disabled /></div>
        <div className="justify-self-center"><ModBadge kind="gh" tri="any" disabled /></div>

        <TimeFilterPair
          minSec={current.lenMin} maxSec={current.lenMax}
          onMin={(v) => update({ lenMin: v })} onMax={(v) => update({ lenMax: v })} />

        <FilterPair label="★" step="0.01"
          minVal={current.starMin} maxVal={current.starMax}
          onMin={(v) => update({ starMin: v })} onMax={(v) => update({ starMax: v })} />

        <div
          className="flex justify-center text-text-muted"
          title="Overweightness — higher = easier to farm RP"
        >
          <svg
            width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
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
        </div>

        <div className="flex justify-end pr-5 text-text-muted" title="Players who have this map+mods in their top 100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
      </div>

      {showExtra && (
        <div className="flex items-center gap-3 px-3 py-2 border-t border-line/70 flex-wrap">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs uppercase tracking-wider text-text-muted">updated</span>
            <select
              className="text-sm py-1.5"
              value={current.window}
              onChange={(e) => update({ window: e.target.value === "all" ? null : e.target.value })}
            >
              {DATE_WINDOWS.map((w) => (
                <option key={w.key} value={w.key}>{w.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs uppercase tracking-wider text-text-muted">sort</span>
            <select
              className="text-sm py-1.5"
              value={current.sort}
              onChange={(e) => update({ sort: e.target.value === "farm" ? null : e.target.value })}
            >
              {MAPS_SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
    </>
  );
}

function parseTimeInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.includes(":")) {
    const parts = t.split(":");
    const mins = parseInt(parts[0] ?? "", 10);
    const secs = parseInt(parts[1] ?? "0", 10);
    if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
    return mins * 60 + secs;
  }
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}
function formatTimeInput(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TimeFilterPair({
  minSec,
  maxSec,
  onMin,
  onMax,
}: {
  minSec: string;
  maxSec: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  const [minText, setMinText] = useState(() => formatTimeInput(Number(minSec) || null));
  const [maxText, setMaxText] = useState(() => formatTimeInput(Number(maxSec) || null));
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedMin = useRef<number | null>(null);
  const lastCommittedMax = useRef<number | null>(null);
  const onMinRef = useRef(onMin);
  const onMaxRef = useRef(onMax);
  useEffect(() => { onMinRef.current = onMin; });
  useEffect(() => { onMaxRef.current = onMax; });

  useEffect(() => {
    const urlSec = Number(minSec) || null;
    if (urlSec === lastCommittedMin.current) return;
    setMinText(formatTimeInput(urlSec));
    lastCommittedMin.current = urlSec;
    if (minTimer.current) {
      clearTimeout(minTimer.current);
      minTimer.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minSec]);
  useEffect(() => {
    const urlSec = Number(maxSec) || null;
    if (urlSec === lastCommittedMax.current) return;
    setMaxText(formatTimeInput(urlSec));
    lastCommittedMax.current = urlSec;
    if (maxTimer.current) {
      clearTimeout(maxTimer.current);
      maxTimer.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxSec]);
  useEffect(
    () => () => {
      if (minTimer.current) clearTimeout(minTimer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
    },
    [],
  );

  function handle(
    next: string,
    setter: (v: string) => void,
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    lastCommittedRef: React.MutableRefObject<number | null>,
    commitRef: React.MutableRefObject<(v: string) => void>,
  ) {
    setter(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (next === "") {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        lastCommittedRef.current = null;
        commitRef.current("");
      }, 250);
      return;
    }
    const sec = parseTimeInput(next);
    if (sec != null) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        lastCommittedRef.current = sec;
        commitRef.current(String(sec));
      }, 250);
    }
  }

  return (
    <div className="filter-pair is-time">
      <span className="text-xs uppercase tracking-wider text-text-muted shrink-0">⏱</span>
      <input
        type="text"
        inputMode="numeric"
        placeholder="0:00"
        value={minText}
        onChange={(e) => handle(e.target.value, setMinText, minTimer, lastCommittedMin, onMinRef)}
      />
      <input
        type="text"
        inputMode="numeric"
        placeholder="0:00"
        value={maxText}
        onChange={(e) => handle(e.target.value, setMaxText, maxTimer, lastCommittedMax, onMaxRef)}
      />
    </div>
  );
}

function FilterPair({
  label,
  step,
  minVal,
  maxVal,
  onMin,
  onMax,
}: {
  label: string;
  step?: string;
  minVal: string;
  maxVal: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  return (
    <div className="filter-pair">
      <span className="text-xs uppercase tracking-wider text-text-muted shrink-0">{label}</span>
      <TextFilter
        type="number"
        inputMode="decimal"
        step={step ?? "1"}
        placeholder="min"
        value={minVal}
        onCommit={onMin}
      />
      <TextFilter
        type="number"
        inputMode="decimal"
        step={step ?? "1"}
        placeholder="max"
        value={maxVal}
        onCommit={onMax}
      />
    </div>
  );
}

function ModBadge({
  kind,
  tri,
  onClick,
  active,
  disabled,
}: {
  kind: "hr" | "gh";
  tri: Tri;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const stateClass = disabled
    ? ""
    : tri === "on"
    ? "is-on"
    : tri === "any"
    ? "is-any"
    : "";
  const Icon = kind === "hr" ? HardrockIcon : GhostIcon;
  const ringClass = active ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-elev" : "";
  const disabledClass = disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "";
  return (
    <span
      role={onClick && !disabled ? "button" : undefined}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      className={`mod-badge mod-${kind} ${stateClass} ${ringClass} ${disabledClass}`}
    >
      <span className="flex items-center justify-center">
        <Icon size={22} />
      </span>
    </span>
  );
}

function SpeedBadge({
  speed,
  onClick,
  active,
}: {
  speed: SpeedState;
  onClick?: () => void;
  active?: boolean;
}) {
  const isAny = speed === "any";
  const stateClass = isAny ? "is-any" : speed === 1 ? "" : "is-on";
  const ringClass = active ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-elev" : "";
  return (
    <span
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={`mod-badge mod-speed ${stateClass} ${ringClass}`}
    >
      <span className="flex items-center justify-center">
        <SpeedIcon speed={isAny ? 1.25 : (speed as number)} size={22} />
      </span>
    </span>
  );
}

const MOBILE_INPUT_CLASS =
  "flex-1 min-w-0 text-sm py-1.5 px-2 text-center bg-bg-elev border border-line rounded placeholder:text-text-muted focus:outline-none focus:border-accent";

function MobileRangeRow({
  label, step,
  minVal, maxVal, onMin, onMax,
}: {
  label: string;
  step?: string;
  minVal: string;
  maxVal: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-xs uppercase tracking-wider text-text-muted">{label}</span>
      <TextFilter
        type="number" inputMode="decimal" step={step ?? "1"} placeholder="min"
        className={MOBILE_INPUT_CLASS}
        value={minVal} onCommit={onMin}
      />
      <TextFilter
        type="number" inputMode="decimal" step={step ?? "1"} placeholder="max"
        className={MOBILE_INPUT_CLASS}
        value={maxVal} onCommit={onMax}
      />
    </div>
  );
}

function MobileTimeRow({
  minSec, maxSec, onMin, onMax,
}: {
  minSec: string;
  maxSec: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  const [minText, setMinText] = useState(() => formatTimeInput(Number(minSec) || null));
  const [maxText, setMaxText] = useState(() => formatTimeInput(Number(maxSec) || null));
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMinRef = useRef(onMin);
  const onMaxRef = useRef(onMax);
  useEffect(() => { onMinRef.current = onMin; });
  useEffect(() => { onMaxRef.current = onMax; });

  useEffect(() => setMinText(formatTimeInput(Number(minSec) || null)), [minSec]);
  useEffect(() => setMaxText(formatTimeInput(Number(maxSec) || null)), [maxSec]);
  useEffect(() => () => {
    if (minTimer.current) clearTimeout(minTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
  }, []);

  function handle(
    next: string,
    setter: (v: string) => void,
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    commitRef: React.MutableRefObject<(v: string) => void>,
  ) {
    setter(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (next === "") {
      timerRef.current = setTimeout(() => { timerRef.current = null; commitRef.current(""); }, 250);
      return;
    }
    const sec = parseTimeInput(next);
    if (sec != null) {
      timerRef.current = setTimeout(() => { timerRef.current = null; commitRef.current(String(sec)); }, 250);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-xs uppercase tracking-wider text-text-muted">⏱</span>
      <input
        type="text" inputMode="numeric" placeholder="0:00"
        className={MOBILE_INPUT_CLASS}
        value={minText}
        onChange={(e) => handle(e.target.value, setMinText, minTimer, onMinRef)}
      />
      <input
        type="text" inputMode="numeric" placeholder="0:00"
        className={MOBILE_INPUT_CLASS}
        value={maxText}
        onChange={(e) => handle(e.target.value, setMaxText, maxTimer, onMaxRef)}
      />
    </div>
  );
}
