import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export type SiteSummary = {
  maps: number;
  scores: number;
  players: number;
  lastRefreshedAt: string | null;
};

export const getSiteSummary = unstable_cache(
  async (): Promise<SiteSummary> => {
    const [maps, scores, players, lastRun] = await Promise.all([
      prisma.beatmap.count({ where: { variants: { some: {} } } }),
      prisma.score.count(),
      prisma.player.count({ where: { topScores: { some: {} } } }),
      prisma.scrapeRun.findFirst({
        where: { finishedAt: { not: null } },
        orderBy: { finishedAt: "desc" },
        select: { finishedAt: true },
      }),
    ]);
    return {
      maps,
      scores,
      players,
      lastRefreshedAt: lastRun?.finishedAt ? lastRun.finishedAt.toISOString() : null,
    };
  },
  ["site-summary"],
  { revalidate: 3600 },
);
