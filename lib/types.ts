export const SPEED_OPTIONS = [0.75, 0.8, 0.87, 1.0, 1.15, 1.25, 1.35, 1.45] as const;
export type Speed = (typeof SPEED_OPTIONS)[number];

export const DATE_WINDOWS = [
  { key: "1w", label: "Last week", days: 7 },
  { key: "1m", label: "Last month", days: 30 },
  { key: "3m", label: "Last 3 months", days: 90 },
  { key: "6m", label: "Last 6 months", days: 180 },
  { key: "1y", label: "Last year", days: 365 },
  { key: "all", label: "All time", days: null },
] as const;
export type DateWindowKey = (typeof DATE_WINDOWS)[number]["key"];

export type BeatmapVariant = {
  id: number;
  speed: Speed;
  hardrock: boolean;
  ghost: boolean;
  avgRp: number;
  sampleCount: number;
  overweightness: number;
};

export type Beatmap = {
  legacyMapId: string;
  mapId: number | null;
  title: string;
  starRating: number | null;
  difficulty: number | null;
  length: number | null;
  noteCount: number | null;
  image: string | null;
  beatmapFile: string | null;
  hasAudio: boolean | null;
  rankedAt: string | null;
  mapper: { id: number; username: string } | null;
  variants: BeatmapVariant[];
  bestVariantId: number | null;
};

export const MAPS_SORT_OPTIONS = [
  { key: "farm",  label: "farmable first (recommended)" },
  { key: "hard",  label: "↑ difficulty" },
  { key: "easy",  label: "↓ difficulty" },
  { key: "long",  label: "↑ length" },
  { key: "short", label: "↓ length" },
  { key: "rp",    label: "↑ RP" },
] as const;
export type MapsSortKey = (typeof MAPS_SORT_OPTIONS)[number]["key"];

export type ModFilter = boolean | null;

export type MapsFilters = {
  window: DateWindowKey;
  search: string;
  rpMin: number | null;
  rpMax: number | null;
  speed: Speed | null;
  hardrock: ModFilter;
  ghost: ModFilter;
  lengthMin: number | null;
  lengthMax: number | null;
  starsMin: number | null;
  starsMax: number | null;
  sort: MapsSortKey;
  page: number;
  perPage: number;
};
