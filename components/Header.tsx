import Link from "next/link";
import { NavLink } from "./NavLink";
import { DiscordButton } from "./DiscordButton";
import { getSiteSummary } from "@/lib/counts";
import { relativeDate } from "@/lib/format";

export async function Header() {
  const { maps, scores, players, lastRefreshedAt } = await getSiteSummary();
  const updated = lastRefreshedAt ? relativeDate(lastRefreshedAt) : null;

  return (
    <header className="border-b border-line bg-bg-elev">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-1 text-xl sm:text-2xl font-semibold tracking-tight flex-wrap">
          <Link href="/maps" className="text-text-dim hover:text-accent">
            <span className="text-text">rp</span>
          </Link>
          <Dot />
          <NavLink href="/maps">maps</NavLink>
          <Dot />
          <NavLink href="/faq">faq</NavLink>
        </div>
        <div className="flex items-center gap-4 flex-wrap w-full sm:w-auto sm:justify-end">
          <div
            className="text-sm text-text-dim leading-tight"
            title={updated ? `Last refreshed ${lastRefreshedAt}` : undefined}
          >
            <span className="text-text font-mono">{maps.toLocaleString()}</span> farm maps
            {" across "}
            <span className="text-text font-mono">{scores.toLocaleString()}</span> scores
            {" from "}
            <span className="text-text font-mono">{players.toLocaleString()}</span> players
            {updated && (
              <>
                {" · "}
                updated <span className="text-text">{updated}</span>
              </>
            )}
          </div>
          <DiscordButton />
        </div>
      </div>
    </header>
  );
}

function Dot() {
  return <span className="text-text-muted">·</span>;
}
