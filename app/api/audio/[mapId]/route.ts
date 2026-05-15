import { prisma } from "@/lib/prisma";
import { parseSspmAudio } from "@/lib/sspm";

export const runtime = "nodejs";

const CACHE = "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ mapId: string }> },
) {
  const { mapId } = await ctx.params;
  const mapIdNum = Number(mapId);
  if (!Number.isFinite(mapIdNum) || mapIdNum <= 0) {
    return new Response("bad map id", { status: 400 });
  }

  const beatmap = await prisma.beatmap.findFirst({
    where: { mapId: mapIdNum },
    select: { beatmapFile: true, hasAudio: true },
  });
  if (!beatmap?.beatmapFile || beatmap.hasAudio === false) {
    return new Response("not found", { status: 404 });
  }

  const upstream = await fetch(beatmap.beatmapFile, { cache: "no-store" });
  if (!upstream.ok) {
    return new Response("upstream error", { status: 502 });
  }
  const sspm = new Uint8Array(await upstream.arrayBuffer());

  let audio: ReturnType<typeof parseSspmAudio>;
  try {
    audio = parseSspmAudio(sspm);
  } catch (err) {
    return new Response(`sspm parse error: ${(err as Error).message}`, { status: 422 });
  }
  if (!audio) {
    return new Response("no audio in beatmap", { status: 204 });
  }

  const total = audio.data.length;
  const rangeHeader = req.headers.get("range");
  if (rangeHeader) {
    const m = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
    if (m) {
      const start = Number(m[1]);
      const end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
      if (Number.isFinite(start) && start <= end) {
        const slice = audio.data.subarray(start, end + 1);
        return new Response(new Blob([slice], { type: audio.mime }), {
          status: 206,
          headers: {
            "content-type": audio.mime,
            "content-length": String(slice.length),
            "content-range": `bytes ${start}-${end}/${total}`,
            "accept-ranges": "bytes",
            "cache-control": CACHE,
          },
        });
      }
      return new Response("range not satisfiable", {
        status: 416,
        headers: { "content-range": `bytes */${total}` },
      });
    }
  }

  return new Response(new Blob([audio.data], { type: audio.mime }), {
    headers: {
      "content-type": audio.mime,
      "content-length": String(total),
      "accept-ranges": "bytes",
      "cache-control": CACHE,
    },
  });
}
