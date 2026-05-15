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
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      view: sp.get("view") === "grid" ? "grid" : "detailed",
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
    <div className="rounded-xl border border-white/10 bg-bg-elev p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="hidden md:flex items-center rounded-full border border-white/10 bg-black/20 p-1 h-9">
          <button
            type="button"
            onClick={() => update({ view: null })}
            className={`flex items-center gap-2 rounded-full h-7 px-3 text-sm transition ${
              current.view === "detailed"
                ? "bg-[#1a1b1c] text-white"
                : "text-white/60 hover:bg-[#17181A]"
            }`}
          >
            <LayoutListIcon />
            <span>Detailed</span>
          </button>
          <button
            type="button"
            onClick={() => update({ view: "grid" })}
            className={`flex items-center gap-2 rounded-full h-7 px-3 text-sm transition ${
              current.view === "grid"
                ? "bg-[#1a1b1c] text-white"
                : "text-white/60 hover:bg-[#17181A]"
            }`}
          >
            <LayoutGridIcon />
            <span>Grid</span>
          </button>
        </div>

        <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-between">
          <button
            type="button"
            onClick={() => startTransition(() => router.push(pathname))}
            disabled={!hasAny}
            className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/15 h-9 px-4 text-sm text-white transition hover:bg-red-500/25 disabled:opacity-30 disabled:hover:bg-red-500/15"
          >
            <ResetIcon />
            Reset filters
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border h-9 px-4 text-sm transition ${
              showAdvanced ? "border-white/15 bg-white/10 text-white" : "border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            Advanced Filters
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      <DifficultySelect
        minVal={current.starMin}
        maxVal={current.starMax}
        onChange={(min, max) => update({ starMin: min, starMax: max })}
      />

      <div className="space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
          <TextFilter
            type="text"
            placeholder="Search map by name, creator, or genre..."
            value={current.q}
            onCommit={(v) => update({ q: v })}
            className="flex w-full h-12 rounded-xl border border-white/10 bg-black/15 hover:bg-[#17181A] pl-11 pr-4 text-base text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-3 gap-4 rounded-xl border border-white/10 bg-black/20 p-4 max-md:grid-cols-1">
            <FieldGroup label="Mods">
              <div className="flex flex-wrap gap-2">
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
                      fullWidth
                    />
                  )}
                />
                <ModFilterPopover<Tri>
                  trigger={
                    <ModBadge
                      kind="hr"
                      tri={current.hr}
                      onClick={() => update({ hr: triToUrl(nextTri(current.hr)) })}
                    />
                  }
                  options={TRI_ORDER}
                  onSelect={(v) => update({ hr: triToUrl(v) })}
                  renderOption={(v) => (
                    <ModBadge kind="hr" tri={v} active={current.hr === v} fullWidth />
                  )}
                />
                <ModFilterPopover<Tri>
                  trigger={
                    <ModBadge
                      kind="gh"
                      tri={current.gh}
                      onClick={() => update({ gh: triToUrl(nextTri(current.gh)) })}
                    />
                  }
                  options={TRI_ORDER}
                  onSelect={(v) => update({ gh: triToUrl(v) })}
                  renderOption={(v) => (
                    <ModBadge kind="gh" tri={v} active={current.gh === v} fullWidth />
                  )}
                />
              </div>
            </FieldGroup>

            <div className="space-y-3">
              <FieldGroup label="RP">
                <RangePair
                  minVal={current.rpMin}
                  maxVal={current.rpMax}
                  onMin={(v) => update({ rpMin: v })}
                  onMax={(v) => update({ rpMax: v })}
                />
              </FieldGroup>
              <FieldGroup label="Length">
                <TimeRangePair
                  minSec={current.lenMin}
                  maxSec={current.lenMax}
                  onMin={(v) => update({ lenMin: v })}
                  onMax={(v) => update({ lenMax: v })}
                />
              </FieldGroup>
            </div>

            <div className="space-y-3">
              <FieldGroup label="Last updated">
                <Select
                  value={current.window}
                  onChange={(v) => update({ window: v === "all" ? null : v })}
                  options={DATE_WINDOWS.map((w) => ({ value: w.key, label: w.label }))}
                />
              </FieldGroup>
              <FieldGroup label="Sort by">
                <Select
                  value={current.sort}
                  onChange={(v) => update({ sort: v === "farm" ? null : v })}
                  options={MAPS_SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
                />
              </FieldGroup>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="ml-1 text-sm font-medium text-white">{label}</div>
      {children}
    </div>
  );
}

const FIELD_INPUT_CLASS =
  "flex h-10 w-full rounded-md border border-white/10 bg-bg-elev px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function RangePair({
  minVal,
  maxVal,
  onMin,
  onMax,
}: {
  minVal: string;
  maxVal: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <TextFilter
        type="number"
        inputMode="decimal"
        placeholder="min"
        value={minVal}
        onCommit={onMin}
        className={FIELD_INPUT_CLASS}
      />
      <TextFilter
        type="number"
        inputMode="decimal"
        placeholder="max"
        value={maxVal}
        onCommit={onMax}
        className={FIELD_INPUT_CLASS}
      />
    </div>
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

function TimeRangePair({
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
      <input
        type="text" inputMode="numeric" placeholder="0:00"
        className={FIELD_INPUT_CLASS}
        value={minText}
        onChange={(e) => handle(e.target.value, setMinText, minTimer, onMinRef)}
      />
      <input
        type="text" inputMode="numeric" placeholder="0:00"
        className={FIELD_INPUT_CLASS}
        value={maxText}
        onChange={(e) => handle(e.target.value, setMaxText, maxTimer, onMaxRef)}
      />
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${FIELD_INPUT_CLASS} pr-8`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

const BADGE_BASE_CLASS =
  "inline-flex items-center gap-2 rounded-md h-10 pl-2 pr-3 min-w-[88px] bg-bg-elev border border-white/10 transition-all";
const BADGE_ICON_BOX = "relative inline-flex items-center justify-center shrink-0";
const BADGE_ICON_STYLE: React.CSSProperties = { width: 36, height: 28 };

function ModBadge({
  kind,
  tri,
  onClick,
  active,
  disabled,
  fullWidth,
}: {
  kind: "hr" | "gh";
  tri: Tri;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const Icon = kind === "hr" ? HardrockIcon : GhostIcon;
  const opacityClass = tri === "on" ? "opacity-100" : tri === "off" ? "opacity-65" : "opacity-40";
  const showStrike = tri === "off" && !disabled;
  const label = tri === "on" ? "On" : tri === "off" ? "Off" : "Any";
  const ringClass = active ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-bg-elev" : "";
  const disabledClass = disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer hover:brightness-110";
  return (
    <span
      role={onClick && !disabled ? "button" : undefined}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      className={`${BADGE_BASE_CLASS} ${fullWidth ? "w-full" : ""} ${ringClass} ${disabledClass}`}
    >
      <span className={BADGE_ICON_BOX} style={BADGE_ICON_STYLE}>
        <span className={`${opacityClass} inline-flex items-center justify-center w-full h-full`}>
          <Icon size={28} />
        </span>
        {showStrike && (
          <svg className="absolute inset-0 m-auto pointer-events-none" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <line x1="4" y1="24" x2="24" y2="4" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <span className="text-sm text-white/80">{label}</span>
    </span>
  );
}

function SpeedBadge({
  speed,
  onClick,
  active,
  fullWidth,
}: {
  speed: SpeedState;
  onClick?: () => void;
  active?: boolean;
  fullWidth?: boolean;
}) {
  const isAny = speed === "any";
  const ringClass = active ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-bg-elev" : "";
  return (
    <span
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={`${BADGE_BASE_CLASS} ${fullWidth ? "w-full" : ""} cursor-pointer hover:brightness-110 ${ringClass}`}
    >
      <span className={BADGE_ICON_BOX} style={BADGE_ICON_STYLE}>
        {isAny ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/mods/modspeed.png"
            alt=""
            draggable={false}
            className="opacity-40 pointer-events-none select-none w-full h-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/mods/${speedFile(speed as number)}`}
            alt=""
            draggable={false}
            className="pointer-events-none select-none w-full h-full object-contain"
          />
        )}
      </span>
      <span className="text-sm text-white/80">
        {isAny ? "Any" : `${(speed as number).toFixed(2).replace(/\.?0+$/, "")}x`}
      </span>
    </span>
  );
}

function speedFile(speed: number): string {
  const map: Record<string, string> = {
    "0.75": "modspeedminusminusminus.png",
    "0.8": "modspeedminusminus.png",
    "0.87": "modspeedminus.png",
    "1": "modspeed.png",
    "1.0": "modspeed.png",
    "1.15": "modspeedplus.png",
    "1.25": "modspeedplusplus.png",
    "1.35": "modspeedplusplusplus.png",
    "1.45": "modspeedplusplusplusplus.png",
  };
  return map[String(speed)] ?? "modspeed.png";
}

const DIFFICULTY_PRESETS: Array<{
  key: string;
  label: string;
  sub: string;
  min: string;
  max: string;
}> = [
  { key: "any",  label: "Any Maps",     sub: "All difficulties", min: "",  max: ""  },
  { key: "easy", label: "Beginner",     sub: "★ 0–3",            min: "",  max: "3" },
  { key: "med",  label: "Intermediate", sub: "★ 3–5",            min: "3", max: "5" },
  { key: "hard", label: "Hard",         sub: "★ 5–7",            min: "5", max: "7" },
  { key: "exp",  label: "Expert",       sub: "★ 7–20",           min: "7", max: ""  },
];

function DifficultySelect({
  minVal,
  maxVal,
  onChange,
}: {
  minVal: string;
  maxVal: string;
  onChange: (min: string, max: string) => void;
}) {
  const matchedKey = (() => {
    for (const p of DIFFICULTY_PRESETS) {
      if (p.min === minVal && p.max === maxVal) return p.key;
    }
    return null;
  })();
  return (
    <div className="grid grid-cols-5 gap-2 max-md:grid-cols-2">
      {DIFFICULTY_PRESETS.map((p) => {
        const active = p.key === matchedKey;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.min, p.max)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              active
                ? "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/15"
                : "border-white/10 bg-bg-elev hover:bg-white/5"
            }`}
          >
            <div className="text-sm font-semibold text-white leading-tight">{p.label}</div>
            <div className="mt-1 text-xs text-white/50 leading-tight">{p.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function LayoutListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <path d="M14 4h7" />
      <path d="M14 9h7" />
      <path d="M14 15h7" />
      <path d="M14 20h7" />
    </svg>
  );
}

function LayoutGridIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
