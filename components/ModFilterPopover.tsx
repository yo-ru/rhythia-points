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
  const [offsetX, setOffsetX] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div
      ref={ref}
      className="relative justify-self-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {trigger}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-1/2 top-full z-50 pt-1"
          style={{ transform: `translateX(calc(-50% + ${offsetX}px))` }}
        >
          <div
            className="flex flex-wrap items-center justify-center gap-1 bg-bg-elev border border-line rounded-lg p-1.5 shadow-xl shadow-black/40"
            style={{ maxWidth: "min(20rem, calc(100vw - 1rem))" }}
          >
            {options.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  onSelect(v);
                  setOpen(false);
                }}
                className="block"
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
