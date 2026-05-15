import Link from "next/link";
import { NavLink } from "./NavLink";
import { DiscordButton } from "./DiscordButton";
import { GitHubButton } from "./GitHubButton";
import { getSiteSummary } from "@/lib/counts";
import { relativeDate } from "@/lib/format";

export async function Header() {
  const { maps, scores, players, lastRefreshedAt } = await getSiteSummary();
  const updated = lastRefreshedAt ? relativeDate(lastRefreshedAt) : null;

  return (
    <header className="border-b border-line bg-bg-elev">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-baseline gap-1 text-xl sm:text-2xl font-semibold tracking-tight flex-wrap">
          <Link href="/maps" className="text-text-dim hover:text-accent">
            <span className="text-text">rp</span>
          </Link>
          <Dot />
          <NavLink href="/maps">maps</NavLink>
          <Dot />
          <NavLink href="/faq">faq</NavLink>
        </div>
        <div className="flex flex-col sm:items-end gap-2 sm:gap-1">
          <div
            className="hidden sm:block text-sm text-text-dim leading-tight"
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
          <div
            className="sm:hidden text-xs text-text-dim leading-tight"
            title={updated ? `Last refreshed ${lastRefreshedAt}` : undefined}
          >
            <span className="text-text font-mono">{maps.toLocaleString()}</span> maps
            {" · "}
            <span className="text-text font-mono">{scores.toLocaleString()}</span> scores
            {" · "}
            <span className="text-text font-mono">{players.toLocaleString()}</span> players
            {updated && (
              <>
                {" · "}
                <span className="text-text">{updated}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <DiscordButton />
            <GitHubButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function Dot() {
  return <span className="text-text-muted">·</span>;
}
