import { PrismaClient } from "@prisma/client";
import { rhythia } from "../lib/rhythia";
import { parallelMap } from "./concurrency";

const prisma = new PrismaClient();
const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 200);
const ART_DELAY_MS = Number(process.env.ART_DELAY_MS ?? 100);
const MAP_LIMIT = Number(process.env.SCRAPE_MAP_LIMIT ?? 20000);
const CONCURRENCY = Number(process.env.ENRICH_CONCURRENCY ?? 3);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type ArtResult =
  | { kind: "hit"; url: string }
  | { kind: "miss" }
  | { kind: "error"; status?: number };

let artChain: Promise<unknown> = Promise.resolve();

async function lookupDeezerArt(title: string): Promise<ArtResult> {
  const turn = artChain.then(async (): Promise<ArtResult> => {
    try {
      const cleaned = title.replace(/[\(\[][^)\]]*[\)\]]/g, " ").replace(/\s+/g, " ").trim();
      if (!cleaned) return { kind: "miss" };
      const url = `https://api.deezer.com/search?q=${encodeURIComponent(cleaned)}&limit=1`;
      try {
        const res = await fetch(url);
        if (!res.ok) return { kind: "error", status: res.status };
        const j = (await res.json()) as {
          data?: Array<{ album?: { cover_xl?: string; cover_big?: string; cover_medium?: string } }>;
        };
        const album = j.data?.[0]?.album;
        const cover = album?.cover_xl ?? album?.cover_big ?? album?.cover_medium;
        if (!cover) return { kind: "miss" };
        return { kind: "hit", url: cover };
      } catch {
        return { kind: "error" };
      }
    } finally {
      await sleep(ART_DELAY_MS);
    }
  });
  artChain = turn.catch(() => undefined);
  return turn;
}

type ModTag = "mod_hardrock" | "mod_ghost" | "mod_sudden_death" | "mod_mirror" | (string & {});

function modsHas(mods: unknown, tag: ModTag): boolean {
  if (!Array.isArray(mods)) return false;
  return mods.includes(tag);
}

async function main() {
  const startedAt = Date.now();
  const force = process.argv.includes("--force");
  // image:null isn't in the OR — would re-trigger Deezer every run on maps
  // that legitimately have no cover art. --force overrides.
  const where = force
    ? {}
    : {
        OR: [
          { rankedAt: null },
          { mapperId: null },
          { beatmapFile: null },
        ],
      };

  const beatmaps = await prisma.beatmap.findMany({
    where,
    select: { id: true, title: true },
    orderBy: [{ scores: { _count: "desc" } }],
    take: MAP_LIMIT,
  });
  console.log(
    `enrich · ${beatmaps.length} maps to process${force ? " (forced re-fetch)" : ""}` +
      ` · cap ${MAP_LIMIT} · ${CONCURRENCY} workers`,
  );

  const knownScoreIds = new Set(
    (await prisma.score.findMany({ select: { id: true } })).map((s) => s.id),
  );
  console.log(`  ${knownScoreIds.size} scores currently in DB — will tag mods for these`);

  let enriched = 0;
  let failed = 0;
  const mapperIds = new Set<number>();
  let modsTagged = 0;
  let artHits = 0;
  let artMisses = 0;
  let artErrors = 0;
  let artThrottled = 0;
  let lastThrottleWarned = 0;

  await parallelMap(
    beatmaps,
    CONCURRENCY,
    async (bm, i) => {
    try {
      const res = await rhythia.getBeatmapPageById({ mapId: bm.id, limit: 200 });
      const b = res.beatmap;
      if (!b) {
        failed += 1;
        console.error(`  ! ${bm.id}: no beatmap in response`);
        return;
      }

      if (b.owner != null && b.ownerUsername) {
        mapperIds.add(b.owner);
        await prisma.mapper.upsert({
          where: { id: b.owner },
          update: { username: b.ownerUsername },
          create: { id: b.owner, username: b.ownerUsername },
        });
      }

      const rankedAt =
        b.updated_at != null
          ? new Date(b.updated_at)
          : b.created_at
          ? new Date(b.created_at)
          : null;
      const lengthSec = b.length != null ? Math.round(b.length / 1000) : null;

      let image: string | null = b.image && b.image !== "" ? b.image : null;
      if (!image) {
        const title = b.title ?? bm.title;
        const r = await lookupDeezerArt(title);
        if (r.kind === "hit") {
          image = r.url;
          artHits += 1;
        } else if (r.kind === "error") {
          artErrors += 1;
          if (r.status === 403 || r.status === 429) {
            artThrottled += 1;
            if (artThrottled - lastThrottleWarned >= 50) {
              console.warn(`  ⚠ Deezer ${r.status} — ${artThrottled} so far, raise ART_DELAY_MS`);
              lastThrottleWarned = artThrottled;
            }
          }
        } else {
          artMisses += 1;
        }
      }

      await prisma.beatmap.update({
        where: { id: bm.id },
        data: {
          pageId: b.id,
          title: b.title ?? bm.title,
          starRating: b.starRating ?? null,
          difficulty: b.difficulty ?? null,
          length: lengthSec,
          noteCount: b.noteCount ?? null,
          image,
          beatmapFile: b.beatmapFile ?? null,
          rankedAt,
          mapperId: b.owner ?? null,
        },
      });

      const scoresOnMap = res.scores ?? [];
      const hrIds: number[] = [];
      const ghIds: number[] = [];
      for (const s of scoresOnMap) {
        if (typeof s.id !== "number" || !knownScoreIds.has(s.id)) continue;
        if (modsHas(s.mods, "mod_hardrock")) hrIds.push(s.id);
        if (modsHas(s.mods, "mod_ghost")) ghIds.push(s.id);
      }
      if (hrIds.length > 0) {
        await prisma.score.updateMany({
          where: { id: { in: hrIds } },
          data: { hardrock: true },
        });
        modsTagged += hrIds.length;
      }
      if (ghIds.length > 0) {
        await prisma.score.updateMany({
          where: { id: { in: ghIds } },
          data: { ghost: true },
        });
        modsTagged += ghIds.length;
      }

      enriched += 1;
      if ((i + 1) % 100 === 0 || i === beatmaps.length - 1) {
        console.log(
          `  [${(i + 1).toString().padStart(5)}/${beatmaps.length}] enriched · ` +
          `${mapperIds.size} mappers · ${modsTagged} mod tags · ` +
          `art ${artHits} hit / ${artMisses} miss / ${artErrors} err` +
          (artThrottled > 0 ? ` (${artThrottled} rate-limited)` : ""),
        );
      }
    } catch (err) {
      failed += 1;
      console.error(`  ! ${bm.id}: ${(err as Error).message}`);
    }
    await sleep(DELAY_MS);
    },
    { timeoutMs: 90_000 },
  );

  const elapsed = (Date.now() - startedAt) / 1000;
  console.log(
    `\ndone · ${enriched} enriched · ${failed} failed · ` +
    `${mapperIds.size} mappers seen · ${modsTagged} score-mod tags · ` +
    `art ${artHits} hit / ${artMisses} miss / ${artErrors} err` +
    (artThrottled > 0 ? ` (${artThrottled} rate-limited)` : "") +
    ` · ${elapsed.toFixed(1)}s`,
  );
  console.log("next: npm run derive");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
