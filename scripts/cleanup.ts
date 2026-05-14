import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type DupGroup = {
  title: string;
  mapperId: number;
  noteCount: number | null;
  length: number | null;
  ids: string[];
};

async function findDuplicateBeatmapGroups(): Promise<DupGroup[]> {
  return prisma.$queryRaw<DupGroup[]>`
    SELECT
      b.title,
      b."mapperId" AS "mapperId",
      b."noteCount" AS "noteCount",
      b.length,
      array_agg(b.id) AS ids
    FROM "Beatmap" b
    WHERE b."mapperId" IS NOT NULL
      AND b."noteCount" IS NOT NULL
    GROUP BY b.title, b."mapperId", b."noteCount", b.length
    HAVING COUNT(*) > 1
  `;
}

async function pickCanonicalAndDups(group: DupGroup): Promise<{ canonical: string; dups: string[] }> {
  // Canonical = most scores, tiebreak on having rankedAt/image/beatmapFile, then id.
  const rows = await prisma.beatmap.findMany({
    where: { id: { in: group.ids } },
    select: {
      id: true,
      rankedAt: true,
      image: true,
      beatmapFile: true,
      _count: { select: { scores: true } },
    },
  });
  const ranked = [...rows].sort((a, b) => {
    if (a._count.scores !== b._count.scores) return b._count.scores - a._count.scores;
    const am = (a.rankedAt ? 1 : 0) + (a.image ? 1 : 0) + (a.beatmapFile ? 1 : 0);
    const bm = (b.rankedAt ? 1 : 0) + (b.image ? 1 : 0) + (b.beatmapFile ? 1 : 0);
    if (am !== bm) return bm - am;
    return a.id.localeCompare(b.id);
  });
  return {
    canonical: ranked[0]!.id,
    dups: ranked.slice(1).map((r) => r.id),
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "cleanup · APPLY mode (will delete)" : "cleanup · dry run (use --apply to commit)");

  const dupGroups = await findDuplicateBeatmapGroups();
  let dupBeatmapCount = 0;
  for (const g of dupGroups) dupBeatmapCount += g.ids.length - 1;
  console.log(`  ${dupGroups.length} duplicate-map groups · ${dupBeatmapCount} extra Beatmap rows`);

  const orphanVariants = await prisma.beatmapVariant.count({ where: { sampleCount: 0 } });
  console.log(`  ${orphanVariants} BeatmapVariant rows with sampleCount=0`);

  const orphanMaps = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Beatmap" b
    WHERE NOT EXISTS (SELECT 1 FROM "Score" s WHERE s."beatmapId" = b.id)
  `;
  const orphanMapCount = Number(orphanMaps[0]?.count ?? 0n);
  console.log(`  ${orphanMapCount} Beatmap rows with no scores referencing them`);

  // Players with lastPlayCount set but no scores left (mid-scrape failure
  // or all their maps got cleaned up). Untouched rows (lastPlayCount=null)
  // are healthy phase-1 upserts awaiting their first score fetch.
  const orphanPlayers = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Player" p
    WHERE p."lastPlayCount" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Score" s WHERE s."playerId" = p.id)
  `;
  const orphanPlayerCount = Number(orphanPlayers[0]?.count ?? 0n);
  console.log(`  ${orphanPlayerCount} Player rows with lastPlayCount set but no scores`);

  const orphanMappers = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Mapper" m
    WHERE NOT EXISTS (SELECT 1 FROM "Beatmap" b WHERE b."mapperId" = m.id)
  `;
  const orphanMapperCount = Number(orphanMappers[0]?.count ?? 0n);
  console.log(`  ${orphanMapperCount} Mapper rows with no beatmaps (pre-cleanup)`);

  if (!apply) {
    console.log("\nno changes made. re-run with --apply to delete.");
    return;
  }

  console.log("\napplying...");

  if (dupGroups.length > 0) {
    let movedScores = 0;
    for (const g of dupGroups) {
      const { canonical, dups } = await pickCanonicalAndDups(g);
      const r = await prisma.score.updateMany({
        where: { beatmapId: { in: dups } },
        data: { beatmapId: canonical },
      });
      movedScores += r.count;
    }
    console.log(`  merged ${dupGroups.length} duplicate-map groups · moved ${movedScores} scores onto canonical ids`);
  }

  if (orphanVariants > 0) {
    const r = await prisma.beatmapVariant.deleteMany({ where: { sampleCount: 0 } });
    console.log(`  deleted ${r.count} zero-sample variants`);
  }

  if (orphanMapCount > 0) {
    const r = await prisma.$executeRaw`
      DELETE FROM "Beatmap" b
      WHERE NOT EXISTS (SELECT 1 FROM "Score" s WHERE s."beatmapId" = b.id)
    `;
    console.log(`  deleted ${r} orphan beatmaps (+cascaded variants/scores)`);
  }

  if (orphanPlayerCount > 0) {
    const r = await prisma.$executeRaw`
      DELETE FROM "Player" p
      WHERE p."lastPlayCount" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Score" s WHERE s."playerId" = p.id)
    `;
    console.log(`  deleted ${r} player rows with no remaining scores`);
  }

  const finalOrphanMappers = await prisma.$executeRaw`
    DELETE FROM "Mapper" m
    WHERE NOT EXISTS (SELECT 1 FROM "Beatmap" b WHERE b."mapperId" = m.id)
  `;
  console.log(`  deleted ${finalOrphanMappers} mapper rows with no beatmaps`);

  if (dupGroups.length > 0) {
    console.log("\nnext: npm run derive (variants need to be rebuilt for the merged maps)");
  } else {
    console.log("\ndone.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
