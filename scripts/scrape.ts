import { PrismaClient } from "@prisma/client";
import { rhythia, type RhythiaScore, type RhythiaUser } from "../lib/rhythia";
import { SPEED_OPTIONS } from "../lib/types";
import { parallelMap } from "./concurrency";

const prisma = new PrismaClient();

// SCRAPE_PLAYER_LIMIT optional; unset/0 = pull everyone.
const RAW_PLAYER_LIMIT = Number(process.env.SCRAPE_PLAYER_LIMIT ?? 0);
const PLAYER_LIMIT = RAW_PLAYER_LIMIT > 0 ? RAW_PLAYER_LIMIT : null;
const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 200);
const CONCURRENCY = Number(process.env.SCRAPE_CONCURRENCY ?? 2);
const TOP_SCORES_PER_PLAYER = 100;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeSpeed(raw: number | null | undefined): number {
  if (raw == null) return 1;
  let best: number = SPEED_OPTIONS[0]!;
  let bestDiff = Math.abs(best - raw);
  for (const opt of SPEED_OPTIONS) {
    const d = Math.abs(opt - raw);
    if (d < bestDiff) {
      bestDiff = d;
      best = opt;
    }
  }
  return best;
}

async function gatherPlayers(limit: number | null): Promise<{ user: RhythiaUser; rank: number }[]> {
  const t0 = Date.now();
  const first = await rhythia.getLeaderboard({ page: 1 });
  const pageSize = first.viewPerPage;
  const total = first.total ?? 0;
  const want = limit != null ? Math.min(limit, total) : total;
  const lastPage = Math.max(1, Math.ceil(want / pageSize));
  console.log(
    `  total ${total.toLocaleString()} on leaderboard · page size ${pageSize} · ` +
    `fetching ${lastPage} pages with ${CONCURRENCY} workers` +
    (limit != null ? ` · capped to ${limit.toLocaleString()} players` : ""),
  );

  const pages: RhythiaUser[][] = new Array(lastPage);
  pages[0] = first.leaderboard ?? [];
  console.log(`  page 1 · +${pages[0]!.length} · ${Date.now() - t0}ms`);

  const remaining: number[] = [];
  for (let p = 2; p <= lastPage; p++) remaining.push(p);

  let done = 1;
  await parallelMap(remaining, CONCURRENCY, async (page) => {
    const t = Date.now();
    const res = await rhythia.getLeaderboard({ page });
    pages[page - 1] = res.leaderboard ?? [];
    done += 1;
    if (done % 10 === 0 || done === lastPage) {
      console.log(`  page ${page} · +${pages[page - 1]!.length} · ${done}/${lastPage} done · ${Date.now() - t}ms`);
    }
    await sleep(DELAY_MS);
  });

  const out: { user: RhythiaUser; rank: number }[] = [];
  for (let p = 0; p < pages.length; p++) {
    const batch = pages[p] ?? [];
    for (let i = 0; i < batch.length && out.length < want; i++) {
      out.push({ user: batch[i]!, rank: p * pageSize + i + 1 });
    }
  }
  return out;
}

async function persistPlayer(user: RhythiaUser) {
  await prisma.player.upsert({
    where: { id: user.id },
    update: { username: user.username ?? `user_${user.id}` },
    create: { id: user.id, username: user.username ?? `user_${user.id}` },
  });
}

async function persistScoresForPlayer(playerId: number, scores: RhythiaScore[]) {
  type MapPayload = {
    title: string;
    difficulty: number | null;
    noteCount: number | null;
  };
  const beatmaps = new Map<string, MapPayload>();
  // Variants keyed nomod here — enrich tags real mods later, derive rebuilds.
  const variants = new Map<string, { beatmapId: string; speed: number }>();

  for (const s of scores) {
    if (!s.songId) continue;
    if (!beatmaps.has(s.songId)) {
      beatmaps.set(s.songId, {
        title: s.beatmapTitle ?? s.songId,
        difficulty: s.beatmapDifficulty ?? null,
        noteCount: s.beatmapNotes ?? null,
      });
    }
    const speed = normalizeSpeed(s.speed ?? 1);
    const vKey = `${s.songId}|${speed}`;
    if (!variants.has(vKey)) {
      variants.set(vKey, { beatmapId: s.songId, speed });
    }
  }

  await prisma.beatmap.createMany({
    data: [...beatmaps.entries()].map(([id, m]) => ({
      id,
      title: m.title,
      difficulty: m.difficulty,
      noteCount: m.noteCount,
      starRating: m.difficulty,
    })),
    skipDuplicates: true,
  });

  await prisma.beatmapVariant.createMany({
    data: [...variants.values()].map((v) => ({
      beatmapId: v.beatmapId,
      speed: v.speed,
      hardrock: false,
      ghost: false,
      avgRp: 0,
    })),
    skipDuplicates: true,
  });

  const rows = scores
    .filter((s) => s.songId && typeof s.id === "number")
    .map((s, i) => ({
      id: s.id,
      playerId,
      beatmapId: s.songId!,
      awardedRp: s.awarded_sp ?? 0,
      speed: normalizeSpeed(s.speed ?? 1),
      hardrock: false,
      ghost: false,
      topIndex: i,
    }));

  await prisma.$transaction([
    prisma.score.deleteMany({ where: { playerId } }),
    prisma.score.createMany({ data: rows, skipDuplicates: true }),
  ]);
}

async function main() {
  const startedAt = new Date();
  console.log(
    `scrape · target ${PLAYER_LIMIT != null ? `${PLAYER_LIMIT} players` : "every player upstream has"} · ${startedAt.toISOString()}`,
  );

  const run = await prisma.scrapeRun.create({ data: {} });

  let playersSeen = 0;
  let playersSkipped = 0;
  let scoresSeen = 0;

  try {
    console.log("phase 1 · paginating leaderboard…");
    const players = await gatherPlayers(PLAYER_LIMIT);
    console.log(`  fetched ${players.length} players`);

    const cached = new Map<number, { lastPlayCount: number | null; hasScores: boolean }>();
    const knownPlayers = await prisma.player.findMany({
      where: { id: { in: players.map((p) => p.user.id) } },
      select: {
        id: true,
        lastPlayCount: true,
        _count: { select: { topScores: true } },
      },
    });
    for (const p of knownPlayers) {
      cached.set(p.id, {
        lastPlayCount: p.lastPlayCount,
        hasScores: p._count.topScores > 0,
      });
    }

    const toScrape: typeof players = [];
    for (const p of players) {
      const upstream = p.user.play_count;
      const c = cached.get(p.user.id);
      if (
        c != null &&
        c.hasScores &&
        typeof upstream === "number" &&
        typeof c.lastPlayCount === "number" &&
        upstream === c.lastPlayCount
      ) {
        playersSkipped += 1;
      } else {
        toScrape.push(p);
      }
    }

    console.log(
      `phase 2 · ${toScrape.length} to scrape · ${playersSkipped} unchanged (skipped) · ${CONCURRENCY} workers`,
    );
    await parallelMap(toScrape, CONCURRENCY, async ({ user, rank }, i) => {
      try {
        await persistPlayer(user);
        const res = await rhythia.getUserScores({ id: user.id, limit: TOP_SCORES_PER_PLAYER });
        const top = res.top ?? [];
        // Don't wipe an active player's scores on a transient empty response.
        if (top.length === 0 && typeof user.play_count === "number" && user.play_count > 0) {
          return;
        }
        await persistScoresForPlayer(user.id, top);
        if (typeof user.play_count === "number") {
          await prisma.player.update({
            where: { id: user.id },
            data: { lastPlayCount: user.play_count },
          });
        }
        playersSeen += 1;
        scoresSeen += top.length;
        console.log(
          `  [${(i + 1).toString().padStart(5)}/${toScrape.length}] ` +
          `#${rank} ${user.username ?? user.id} → ${top.length} scores`,
        );
      } catch (err) {
        console.error(`  ! player ${user.id} (${user.username}) failed:`, (err as Error).message);
      }
      await sleep(DELAY_MS);
    });
  } finally {
    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date() },
    });
  }

  const totalScores = await prisma.score.count();
  const totalMaps = await prisma.beatmap.count();
  const totalVariants = await prisma.beatmapVariant.count();
  console.log(
    `\ndone · ${playersSeen} players scraped · ${playersSkipped} skipped (unchanged) · ${scoresSeen} new scores · ` +
    `DB now has ${totalScores} scores · ${totalMaps} maps · ${totalVariants} variants`,
  );
  console.log(`elapsed: ${((Date.now() - startedAt.getTime()) / 1000).toFixed(1)}s`);
  console.log(`next: npm run derive`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
