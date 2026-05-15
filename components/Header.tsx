import Link from "next/link";
import { NavLink } from "./NavLink";
import { DiscordButton } from "./DiscordButton";
import { GitHubButton } from "./GitHubButton";
import { getSiteSummary } from "@/lib/counts";
import { relativeDate } from "@/lib/format";

function RpBadge({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#111214" stroke="rgba(255,255,255,0.10)" strokeWidth={2} />
      <text
        x="32"
        y="46"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        fontSize={32}
        fontWeight={700}
        textAnchor="middle"
        fill="#60a5fa"
      >
        rp
      </text>
    </svg>
  );
}

export async function Header() {
  const { maps, scores, players, lastRefreshedAt } = await getSiteSummary();
  const updated = lastRefreshedAt ? relativeDate(lastRefreshedAt) : null;

  return (
    <header className="nav-tex shadow-lg drop-shadow-sm border-b-2 border-neutral-950 relative z-10">
      <div className="max-w-[1320px] mx-auto h-[60px] px-6 flex items-center gap-3 text-white">
        <Link href="/maps" className="flex items-center gap-2.5 font-bold">
          <RpBadge size={36} />
          <span className="text-xl tracking-tight">rhythia-points</span>
        </Link>
        <div className="hidden md:block w-px h-5 bg-white mx-2" />
        <nav className="hidden md:flex items-center gap-5 text-base">
          <NavLink href="/maps">maps</NavLink>
          <NavLink href="/faq">faq</NavLink>
        </nav>
        <div className="ml-auto hidden md:flex items-center gap-3">
          <div
            className="text-xs text-white/80 leading-tight text-right"
            title={updated ? `Last refreshed ${lastRefreshedAt}` : undefined}
          >
            <span className="text-white font-mono">{maps.toLocaleString()}</span> maps
            {" · "}
            <span className="text-white font-mono">{scores.toLocaleString()}</span> scores
            {" · "}
            <span className="text-white font-mono">{players.toLocaleString()}</span> players
            {updated && (
              <>
                {" · "}
                <span className="text-white">{updated}</span>
              </>
            )}
          </div>
          <DiscordButton />
          <GitHubButton />
        </div>
        <div className="ml-auto flex md:hidden items-center gap-2">
          <NavLink href="/maps">maps</NavLink>
          <NavLink href="/faq">faq</NavLink>
        </div>
      </div>
    </header>
  );
}
