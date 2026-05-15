import { prisma } from "@/lib/prisma";
import { parseSspmNotes } from "@/lib/sspm";

export const runtime = "nodejs";

const CACHE = "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ mapId: string }> },
) {
  const { mapId } = await ctx.params;
  const mapIdNum = Number(mapId);
  if (!Number.isFinite(mapIdNum) || mapIdNum <= 0) {
    return new Response("bad map id", { status: 400 });
  }

  const beatmap = await prisma.beatmap.findFirst({
    where: { mapId: mapIdNum },
    select: { beatmapFile: true },
  });
  if (!beatmap?.beatmapFile) {
    return new Response("not found", { status: 404 });
  }

  const upstream = await fetch(beatmap.beatmapFile, { cache: "no-store" });
  if (!upstream.ok) {
    return new Response("upstream error", { status: 502 });
  }
  const sspm = new Uint8Array(await upstream.arrayBuffer());

  let parsed;
  try {
    parsed = parseSspmNotes(sspm);
  } catch (err) {
    return new Response(`sspm parse error: ${(err as Error).message}`, { status: 422 });
  }

  return Response.json(parsed, {
    headers: { "cache-control": CACHE },
  });
}
