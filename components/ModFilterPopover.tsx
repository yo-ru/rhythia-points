"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function ModFilterPopover<V extends string>({
  trigger,
  options,
  onSelect,
  renderOption,
}: {
  trigger: React.ReactNode;
  options: V[];
  onSelect: (value: V) => void;
  renderOption: (value: V) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    setIsTouch(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !ref.current || !panelRef.current) {
      setOffsetX(0);
      return;
    }
    const trigger = ref.current.getBoundingClientRect();
    const panel = panelRef.current.getBoundingClientRect();
    const triggerCenter = trigger.left + trigger.width / 2;
    const halfWidth = panel.width / 2;
    const margin = 8;
    const viewport = window.innerWidth;
    let shift = 0;
    if (triggerCenter - halfWidth < margin) {
      shift = margin - (triggerCenter - halfWidth);
    } else if (triggerCenter + halfWidth > viewport - margin) {
      shift = -(triggerCenter + halfWidth - (viewport - margin));
    }
    setOffsetX(shift);
  }, [open, options.length]);

  const handleCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isTouch) return;
    if (panelRef.current && panelRef.current.contains(e.target as Node)) return;
    e.stopPropagation();
    e.preventDefault();
    setOpen((o) => !o);
  };

  return (
    <div
      ref={ref}
      className="relative justify-self-center"
      onMouseEnter={isTouch ? undefined : () => setOpen(true)}
      onMouseLeave={isTouch ? undefined : () => setOpen(false)}
      onClickCapture={handleCapture}
    >
      {trigger}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-1/2 top-full z-50 pt-1"
          style={{ transform: `translateX(calc(-50% + ${offsetX}px))` }}
        >
          <div
            className="flex flex-col gap-1 bg-bg-elev border border-white/10 rounded-xl p-1.5 shadow-xl shadow-black/40 w-max"
            style={{ maxWidth: "calc(100vw - 1rem)" }}
          >
            {options.map((v) => (
              <button
                key={v}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(v);
                  setOpen(false);
                }}
                className="block w-full"
              >
                {renderOption(v)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
