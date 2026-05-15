import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type {
  Beatmap,
  BeatmapVariant,
  DateWindowKey,
  MapsFilters,
  MapsSortKey,
  Speed,
} from "./types";
import { DATE_WINDOWS, MAPS_SORT_OPTIONS, SPEED_OPTIONS } from "./types";

export type MapRow = { map: Beatmap; variant: BeatmapVariant };

function windowToCutoff(window: DateWindowKey): Date | null {
  if (window === "all") return null;
  const def = DATE_WINDOWS.find((w) => w.key === window);
  if (!def || def.days == null) return null;
  return new Date(Date.now() - def.days * 24 * 60 * 60 * 1000);
}

export async function queryMaps(filters: MapsFilters): Promise<{ rows: MapRow[]; total: number }> {
  const beatmapWhere: Prisma.BeatmapWhereInput = {};
  if (filters.search) {
    beatmapWhere.title = { contains: filters.search, mode: "insensitive" };
  }
  if (filters.starsMin != null) beatmapWhere.starRating = { gte: filters.starsMin };
  if (filters.starsMax != null) {
    beatmapWhere.starRating = { ...(beatmapWhere.starRating as object), lte: filters.starsMax };
  }
  const cutoff = windowToCutoff(filters.window);
  if (cutoff) beatmapWhere.rankedAt = { gte: cutoff };

  const variantWhere: Prisma.BeatmapVariantWhereInput = {};
  if (filters.speed != null) variantWhere.speed = filters.speed;
  if (filters.hardrock === true) variantWhere.hardrock = true;
  if (filters.hardrock === false) variantWhere.hardrock = false;
  if (filters.ghost === true) variantWhere.ghost = true;
  if (filters.ghost === false) variantWhere.ghost = false;
  if (filters.rpMin != null) variantWhere.avgRp = { gte: filters.rpMin };
  if (filters.rpMax != null) {
    variantWhere.avgRp = { ...(variantWhere.avgRp as object), lte: filters.rpMax };
  }

  let lengthOrClauses: Prisma.BeatmapVariantWhereInput[] | undefined;
  if (filters.lengthMin != null || filters.lengthMax != null) {
    lengthOrClauses = SPEED_OPTIONS.map((speed) => {
      const range: Prisma.IntNullableFilter = {};
      if (filters.lengthMin != null) range.gte = Math.floor(filters.lengthMin * speed);
      if (filters.lengthMax != null) range.lte = Math.ceil(filters.lengthMax * speed);
      return { speed, beatmap: { is: { length: range } } };
    });
  }

  const composed: Prisma.BeatmapVariantWhereInput = {
    ...variantWhere,
    beatmap: { is: beatmapWhere },
    sampleCount: { gt: 0 },
    ...(lengthOrClauses ? { OR: lengthOrClauses } : {}),
  };

  const total = await prisma.beatmapVariant.count({ where: composed });

  const orderBy = sortToOrderBy(filters.sort);
  const rawVariants = await prisma.beatmapVariant.findMany({
    where: composed,
    include: {
      beatmap: {
        include: {
          mapper: { select: { id: true, username: true } },
          variants: true,
        },
      },
    },
    orderBy,
    skip: (filters.page - 1) * filters.perPage,
    take: filters.perPage,
  });

  const rows: MapRow[] = rawVariants.map((v) => ({
    map: toBeatmap(v.beatmap),
    variant: toVariant(v),
  }));

  return { rows, total };
}

function toBeatmap(b: Prisma.BeatmapGetPayload<{
  include: { mapper: { select: { id: true; username: true } }; variants: true };
}>): Beatmap {
  return {
    legacyMapId: b.legacyMapId,
    mapId: b.mapId,
    title: b.title,
    starRating: b.starRating,
    difficulty: b.difficulty,
    length: b.length,
    noteCount: b.noteCount,
    image: b.image,
    beatmapFile: b.beatmapFile,
    hasAudio: b.hasAudio,
    rankedAt: b.rankedAt ? b.rankedAt.toISOString() : null,
    mapper: b.mapper ?? null,
    variants: b.variants.map((v) => toVariant(v)),
    bestVariantId: b.bestVariantId ?? null,
  };
}

function toVariant(v: { id: number; speed: number; hardrock: boolean; ghost: boolean; avgRp: number; sampleCount: number; overweightness: number; }): BeatmapVariant {
  return {
    id: v.id,
    speed: snapSpeed(v.speed),
    hardrock: v.hardrock,
    ghost: v.ghost,
    avgRp: v.avgRp,
    sampleCount: v.sampleCount,
    overweightness: v.overweightness,
  };
}

function sortToOrderBy(sort: MapsSortKey): Prisma.BeatmapVariantOrderByWithRelationInput[] {
  switch (sort) {
    case "rp":   return [{ avgRp: "desc" }];
    case "hard": return [{ beatmap: { starRating: { sort: "desc", nulls: "last" } } }];
    case "easy": return [{ beatmap: { starRating: { sort: "asc",  nulls: "last" } } }];
    case "long": return [{ beatmap: { length:     { sort: "desc", nulls: "last" } } }];
    case "short":return [{ beatmap: { length:     { sort: "asc",  nulls: "last" } } }];
    case "farm":
    default:     return [{ overweightness: "desc" }];
  }
}

function snapSpeed(raw: number): Speed {
  let best: Speed = 1.0;
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

function num(v: string | undefined, fallback: number | null = null): number | null {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function int(v: string | undefined, fallback: number): number {
  const n = num(v, null);
  return n == null ? fallback : Math.max(1, Math.floor(n));
}
function triBool(v: string | undefined): boolean | null {
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return null;
}

export function parseMapsFilters(sp: Record<string, string | string[] | undefined>): MapsFilters {
  const speed = num(getOne(sp.speed));
  const valid = speed != null && (SPEED_OPTIONS as readonly number[]).includes(speed);
  const window = (getOne(sp.window) as DateWindowKey) || "all";
  const rawSort = getOne(sp.sort);
  const sort = (MAPS_SORT_OPTIONS.find((o) => o.key === rawSort)?.key ?? "farm") as MapsSortKey;
  return {
    window: DATE_WINDOWS.some((w) => w.key === window) ? window : "all",
    search: getOne(sp.q) ?? "",
    rpMin: num(getOne(sp.rpMin)),
    rpMax: num(getOne(sp.rpMax)),
    speed: valid ? (speed as Speed) : null,
    hardrock: triBool(getOne(sp.hr)),
    ghost: triBool(getOne(sp.gh)),
    lengthMin: num(getOne(sp.lenMin)),
    lengthMax: num(getOne(sp.lenMax)),
    starsMin: num(getOne(sp.starMin)),
    starsMax: num(getOne(sp.starMax)),
    sort,
    page: int(getOne(sp.page), 1),
    perPage: 25,
  };
}

function getOne(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
