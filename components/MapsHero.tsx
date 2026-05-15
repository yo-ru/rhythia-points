export function MapsHero() {
  return (
    <div className="rounded-xl border border-white/10 bg-bg-elev overflow-hidden">
      <div className="flex items-stretch max-md:flex-col">
        <div className="relative w-28 shrink-0 max-md:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/maphelper.png"
            alt=""
            draggable={false}
            className="absolute bottom-5 left-1/4 h-28 w-auto -translate-x-1/8 object-contain scale-[1.2]"
          />
        </div>
        <div className="flex-1 px-5 py-5">
          <div className="flex items-center gap-1.5">
            <MusicNoteIcon />
            <div className="text-base font-semibold text-white">RP Maps</div>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
            Find the perfect farm map
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/65">
            Maps ranked by <span className="text-white">overweightness</span> &mdash; how much
            RP they hand out relative to other maps at the same difficulty. Top of the list
            is the best return on time.
          </p>
        </div>
      </div>
    </div>
  );
}

function MusicNoteIcon() {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth={0}
      viewBox="0 0 512 512"
      height={19}
      width={19}
      className="text-blue-400"
      aria-hidden="true"
    >
      <path d="M256 64v225.1c-12.6-7.3-27.1-11.7-42.7-11.7-47.1 0-85.3 38.2-85.3 85.3s38.2 85.3 85.3 85.3 85.3-38.2 85.3-85.3V149.3H384V64H256z" />
    </svg>
  );
}
