import { PrismaClient, Prisma } from "@prisma/client";
import { magnitudeByIndex, overweightness } from "../lib/overweightness";

const prisma = new PrismaClient();

const PP_BLOCK_SIZE = 5;
const BULK_CHUNK = 2000;

async function main() {
  const startedAt = Date.now();
  console.log("derive · starting");

  console.log("phase 0 · rebuilding variant table from scores");
  await prisma.beatmap.updateMany({ data: { bestVariantId: null } });
  await prisma.beatmapVariant.deleteMany({});

  type Acc = {
    beatmapId: string;
    speed: number;
    hardrock: boolean;
    ghost: boolean;
    sumRp: number;
    sampleCount: number;
    rawX: number;
  };
  const grouped = new Map<string, Acc>();

  const scores = await prisma.score.findMany({
    select: {
      id: true,
      playerId: true,
      beatmapId: true,
      speed: true,
      hardrock: true,
      ghost: true,
      topIndex: true,
      awardedRp: true,
    },
  });
  console.log(`  ${scores.length} scores`);

  for (const s of scores) {
    const key = `${s.beatmapId}|${s.speed}|${s.hardrock}|${s.ghost}`;
    const g = grouped.get(key);
    const mag = magnitudeByIndex(s.topIndex ?? 0);
    if (g) {
      g.sumRp += s.awardedRp;
      g.sampleCount += 1;
      g.rawX += mag;
    } else {
      grouped.set(key, {
        beatmapId: s.beatmapId,
        speed: s.speed,
        hardrock: s.hardrock,
        ghost: s.ghost,
        sumRp: s.awardedRp,
        sampleCount: 1,
        rawX: mag,
      });
    }
  }

  console.log("phase 1 · population per pp block");
  const topRpByPlayer = new Map<number, number[]>();
  for (const s of scores) {
    if ((s.topIndex ?? 100) >= 10) continue;
    if (!topRpByPlayer.has(s.playerId)) topRpByPlayer.set(s.playerId, []);
    topRpByPlayer.get(s.playerId)!.push(s.awardedRp);
  }
  const peoplePerBlock = new Map<number, number>();
  for (const rps of topRpByPlayer.values()) {
    const avgTop = rps.reduce((a, b) => a + b, 0) / rps.length;
    const block = Math.floor(Math.round(avgTop) / PP_BLOCK_SIZE);
    peoplePerBlock.set(block, (peoplePerBlock.get(block) ?? 0) + 1);
  }
  console.log(
    `  ${topRpByPlayer.size} players with top-10, ${peoplePerBlock.size} blocks`,
  );

  const beatmaps = await prisma.beatmap.findMany({
    select: { legacyMapId: true, rankedAt: true },
  });
  const now = Date.now();
  const hoursByMap = new Map<string, number>();
  for (const b of beatmaps) {
    const h =
      b.rankedAt != null
        ? Math.max(1, Math.floor((now - b.rankedAt.getTime()) / 36e5))
        : 1;
    hoursByMap.set(b.legacyMapId, h);
  }

  console.log("phase 2 · inserting variants with OW");
  const variantData: Prisma.BeatmapVariantCreateManyInput[] = [];
  for (const g of grouped.values()) {
    const avgRp = g.sumRp / g.sampleCount;
    const block = Math.floor(Math.round(avgRp) / PP_BLOCK_SIZE);
    const adj = peoplePerBlock.get(block) ?? 1;
    const hours = hoursByMap.get(g.beatmapId) ?? 1;
    const ow = overweightness({ x: g.rawX, adj, h: hours });
    variantData.push({
      beatmapId: g.beatmapId,
      speed: g.speed,
      hardrock: g.hardrock,
      ghost: g.ghost,
      avgRp,
      sampleCount: g.sampleCount,
      overweightness: ow,
    });
  }
  await prisma.beatmapVariant.createMany({ data: variantData, skipDuplicates: false });
  console.log(`  ${variantData.length} variants created`);

  const variants = await prisma.beatmapVariant.findMany();
  const variantsByMap = new Map<string, typeof variants>();
  for (const v of variants) {
    if (!variantsByMap.has(v.beatmapId)) variantsByMap.set(v.beatmapId, []);
    variantsByMap.get(v.beatmapId)!.push(v);
  }

  const owValues = variants.map((v) => v.overweightness).filter((x) => x > 0);
  const maxOW = owValues.reduce((a, b) => Math.max(a, b), 0);
  console.log(`  max OW = ${maxOW.toFixed(4)}`);

  console.log("phase 3 · best variant per map");
  const bestRows: Array<{ id: string; val: number }> = [];
  for (const [beatmapId, peers] of variantsByMap) {
    if (peers.length === 0) continue;
    const best = peers.reduce((b, p) => (p.overweightness > b.overweightness ? p : b));
    bestRows.push({ id: beatmapId, val: best.id });
  }
  const bestChunks = Math.ceil(bestRows.length / BULK_CHUNK);
  for (let i = 0, c = 0; i < bestRows.length; i += BULK_CHUNK, c++) {
    const chunk = bestRows.slice(i, i + BULK_CHUNK);
    const tuples = Prisma.join(
      chunk.map((r) => Prisma.sql`(${r.id}::text, ${r.val}::int)`),
    );
    const t0 = Date.now();
    await prisma.$executeRaw`
      UPDATE "Beatmap" b
      SET "bestVariantId" = new.val
      FROM (VALUES ${tuples}) AS new(id, val)
      WHERE b.id = new.id
    `;
    console.log(`  chunk ${c + 1}/${bestChunks} · ${chunk.length} rows · ${Date.now() - t0}ms`);
  }
  console.log(`  ${bestRows.length} maps updated`);

  const elapsed = (Date.now() - startedAt) / 1000;
  console.log(`\ndone · ${elapsed.toFixed(1)}s`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
