"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SpeedIcon } from "@/components/icons/SpeedIcon";
import type { SspmNote } from "@/lib/sspm";
import { MapPreviewCanvas } from "@/components/MapPreviewCanvas";

type Track = {
  id: string;
  title: string;
  mapper: string | null;
  cover: string | null;
  src: string;
  speed: number;
  previewMapId?: number | null;
};

type PlayerState = {
  track: Track | null;
  playing: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  hitsoundVolume: number;
  previewNotes: SspmNote[] | null;
  previewLoading: boolean;
};

type PlayerActions = {
  play: (track: Track) => void;
  toggle: () => void;
  close: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setHitsoundVolume: (v: number) => void;
  getCurrentTimeMs: () => number;
  getHitsoundVolume: () => number;
};

type Ctx = PlayerState & PlayerActions;

const PlayerCtx = createContext<Ctx | null>(null);

export function usePlayer(): Ctx {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error("usePlayer outside <MapPlayerProvider>");
  return ctx;
}

export function MapPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMutedState] = useState(false);
  const [hitsoundVolume, setHitsoundVolumeState] = useState(0.3);
  const hitsoundVolRef = useRef(0.3);
  const [previewNotes, setPreviewNotes] = useState<SspmNote[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewReqRef = useRef(0);

  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    audioRef.current = el;
    const onTime = () => setProgress(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.pause();
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  const loadPreviewNotes = useCallback(async (mapId: number) => {
    const reqId = ++previewReqRef.current;
    setPreviewLoading(true);
    setPreviewNotes(null);
    try {
      const res = await fetch(`/api/notes/${mapId}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { notes: SspmNote[] };
      if (previewReqRef.current === reqId) setPreviewNotes(data.notes);
    } catch {
      if (previewReqRef.current === reqId) setPreviewNotes(null);
    } finally {
      if (previewReqRef.current === reqId) setPreviewLoading(false);
    }
  }, []);

  const play = useCallback((t: Track) => {
    const el = audioRef.current;
    if (!el) return;
    const newPreview = (t.previewMapId ?? null) !== (track?.previewMapId ?? null);
    if (track?.id === t.id) {
      if (el.paused) {
        el.play().catch(() => {});
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
      el.playbackRate = t.speed;
      if (newPreview) {
        setTrack(t);
        if (t.previewMapId != null) loadPreviewNotes(t.previewMapId);
        else { previewReqRef.current++; setPreviewNotes(null); setPreviewLoading(false); }
      }
      return;
    }
    el.src = t.src;
    el.volume = volume;
    el.muted = muted;
    el.playbackRate = t.speed;
    el.currentTime = 0;
    setTrack(t);
    setProgress(0);
    setDuration(0);
    el.play().catch(() => {});
    setPlaying(true);
    if (t.previewMapId != null) loadPreviewNotes(t.previewMapId);
    else { previewReqRef.current++; setPreviewNotes(null); setPreviewLoading(false); }
  }, [track, volume, muted, loadPreviewNotes]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [track]);

  const close = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    setTrack(null);
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    previewReqRef.current++;
    setPreviewNotes(null);
    setPreviewLoading(false);
  }, []);

  const seek = useCallback((s: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = s;
    setProgress(s);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    const el = audioRef.current;
    if (el) {
      el.volume = clamped;
      if (clamped > 0 && el.muted) el.muted = false;
    }
    setVolumeState(clamped);
    if (clamped > 0) setMutedState(false);
  }, []);

  const toggleMute = useCallback(() => {
    const el = audioRef.current;
    const next = !muted;
    if (el) el.muted = next;
    setMutedState(next);
  }, [muted]);

  const getCurrentTimeMs = useCallback(() => (audioRef.current?.currentTime ?? 0) * 1000, []);
  const getHitsoundVolume = useCallback(() => hitsoundVolRef.current, []);
  const setHitsoundVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    hitsoundVolRef.current = clamped;
    setHitsoundVolumeState(clamped);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      track, playing, progress, duration, volume, muted, hitsoundVolume,
      previewNotes, previewLoading,
      play, toggle, close, seek, setVolume, toggleMute, setHitsoundVolume,
      getCurrentTimeMs, getHitsoundVolume,
    }),
    [track, playing, progress, duration, volume, muted, hitsoundVolume,
     previewNotes, previewLoading,
     play, toggle, close, seek, setVolume, toggleMute, setHitsoundVolume,
     getCurrentTimeMs, getHitsoundVolume],
  );

  return (
    <PlayerCtx.Provider value={value}>
      {children}
      {track && <PlayerWidgetGate />}
    </PlayerCtx.Provider>
  );
}

function PlayerWidgetGate() {
  const pathname = usePathname();
  const { close } = usePlayer();
  const onMaps = pathname === "/" || pathname === "/maps" || pathname?.startsWith("/maps/");
  useEffect(() => {
    if (!onMaps) close();
  }, [onMaps, close]);
  if (!onMaps) return null;
  return <PlayerWidget />;
}

function Slider({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const ratioFromClientX = useCallback((clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => onChangeRef.current(ratioFromClientX(e.clientX));
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onChangeRef.current(ratioFromClientX(t.clientX));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, ratioFromClientX]);

  const pct = Math.max(0, Math.min(1, value)) * 100;

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={value}
      tabIndex={0}
      className="relative h-1.5 rounded-full bg-bg-row cursor-pointer select-none"
      onMouseDown={(e) => {
        onChangeRef.current(ratioFromClientX(e.clientX));
        setDragging(true);
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) {
          onChangeRef.current(ratioFromClientX(t.clientX));
          setDragging(true);
        }
      }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-accent pointer-events-none"
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute top-1/2 w-3 h-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-accent pointer-events-none shadow"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

function PlayerWidget() {
  const {
    track, playing, progress, duration, volume, muted, hitsoundVolume,
    previewNotes, previewLoading,
    toggle, close, seek, setVolume, toggleMute, setHitsoundVolume,
    getCurrentTimeMs, getHitsoundVolume,
  } = usePlayer();
  if (!track) return null;
  const seekValue = duration > 0 ? progress / duration : 0;
  const speed = track.speed || 1;
  const displayProgress = progress / speed;
  const displayDuration = duration / speed;
  const effectiveVolume = muted ? 0 : volume;
  const previewActive = track.previewMapId != null;

  return (
    <div className="fixed bottom-2 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-3 z-50 max-w-5xl sm:w-[min(64rem,calc(100vw-1rem))]">
      <div className="bg-bg-elev border border-line rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
        <div className="flex items-center gap-3 p-2 sm:p-2.5">
        {track.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={encodeURI(track.cover)}
            alt=""
            className="w-12 h-12 sm:w-14 sm:h-14 rounded shrink-0 object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded shrink-0 bg-bg-row" />
        )}

        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium text-text truncate leading-tight">
                {track.title}
              </span>
              {speed !== 1 && (
                <span
                  className="mod-badge mod-speed is-on pointer-events-none shrink-0 cursor-default"
                  style={{ width: 32, height: 26 }}
                >
                  <SpeedIcon speed={speed} size={20} />
                </span>
              )}
            </div>
            {track.mapper && (
              <div className="text-xs text-text-muted truncate leading-tight">
                {track.mapper}
              </div>
            )}
          </div>

          <div className="px-1.5">
            <Slider
              value={seekValue}
              onChange={(v) => {
                if (duration > 0) seek(v * duration);
              }}
              ariaLabel="Seek"
            />
          </div>
        </div>

        <div className="hidden sm:block text-xs text-text-muted font-mono tabular-nums shrink-0">
          {fmt(displayProgress)} / {fmt(displayDuration)}
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-accent hover:bg-accent-bright flex items-center justify-center shrink-0 transition-colors"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Desktop: icon + slide-out slider. */}
        <div className="group/vol hidden sm:flex items-center shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={effectiveVolume === 0 ? "Unmute" : "Mute"}
            className="w-7 h-7 inline-flex items-center justify-center text-text-dim hover:text-text"
          >
            {effectiveVolume === 0 ? <VolumeMutedIcon /> : <VolumeIcon />}
          </button>
          <div className="overflow-x-hidden overflow-y-visible flex items-center h-4 transition-[max-width] duration-200 ease-out max-w-0 group-hover/vol:max-w-[6rem] focus-within:max-w-[6rem]">
            <div className="w-20 px-1.5">
              <Slider value={effectiveVolume} onChange={setVolume} ariaLabel="Volume" />
            </div>
          </div>
        </div>

        {previewActive && (
          <div className="group/hsv hidden sm:flex items-center shrink-0">
            <span
              className="w-7 h-7 inline-flex items-center justify-center text-text-dim group-hover/hsv:text-text"
              aria-label="Hitsound volume"
              title="Hitsound volume"
            >
              <HitsoundIcon />
            </span>
            <div className="overflow-x-hidden overflow-y-visible flex items-center h-4 transition-[max-width] duration-200 ease-out max-w-0 group-hover/hsv:max-w-[6rem] focus-within:max-w-[6rem]">
              <div className="w-20 px-1.5">
                <Slider value={hitsoundVolume} onChange={setHitsoundVolume} ariaLabel="Hitsound volume" />
              </div>
            </div>
          </div>
        )}

        {/* Mobile: mute toggle only. */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={effectiveVolume === 0 ? "Unmute" : "Mute"}
          className="sm:hidden w-8 h-8 inline-flex items-center justify-center text-text-dim hover:text-text shrink-0"
        >
          {effectiveVolume === 0 ? <VolumeMutedIcon /> : <VolumeIcon />}
        </button>

        <button
          type="button"
          onClick={close}
          aria-label="Close player"
          className="w-8 h-8 inline-flex items-center justify-center text-text-dim hover:text-text shrink-0"
        >
          <CloseIcon />
        </button>
        </div>
        {previewActive && (
          <div className="px-3 pb-3 border-t border-line/60 pt-3">
            {previewNotes && previewNotes.length > 0 ? (
              <MapPreviewCanvas
                notes={previewNotes}
                getTimeMs={getCurrentTimeMs}
                getHitsoundVolume={getHitsoundVolume}
              />
            ) : (
              <div className="w-full aspect-video rounded flex items-center justify-center text-sm text-text-muted">
                {previewLoading ? "loading notes…" : "no notes available"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#16161a" aria-hidden="true" className="ml-0.5">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#16161a" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}
function VolumeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5L6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}
function HitsoundIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
function VolumeMutedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5L6 9H2v6h4l5 4z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
