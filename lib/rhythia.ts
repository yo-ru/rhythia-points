const ENV = process.env.RHYTHIA_ENV ?? "production";
const BASE = `https://${ENV}.rhythia.com`;
const SESSION = process.env.RHYTHIA_SESSION ?? "";
const REQUEST_TIMEOUT_MS = Number(process.env.RHYTHIA_TIMEOUT_MS ?? 15000);

export type RhythiaBeatmap = {
  id: number;
  title?: string | null;
  playcount?: number | null;
  created_at?: string | null;
  updated_at?: number | null;
  difficulty?: number | null;
  noteCount?: number | null;
  length?: number | null;
  ranked?: boolean | null;
  beatmapFile?: string | null;
  image?: string | null;
  imageLarge?: string | null;
  starRating?: number | null;
  owner?: number | null;
  ownerUsername?: string | null;
  ownerAvatar?: string | null;
  status?: string | null;
  description?: string | null;
  tags?: string | null;
  videoUrl?: string | null;
  nominations?: number[] | null;
  qualified?: boolean | null;
  qualifiedAt?: number | null;
  requiresHardrock?: boolean;
};

export type RhythiaScore = {
  id: number;
  awarded_sp?: number | null;
  beatmapHash?: string | null;
  created_at: string;
  misses?: number | null;
  mods?: Record<string, unknown> | string[] | null;
  passed?: boolean | null;
  songId?: string | null;
  speed?: number | null;
  spin?: boolean;
  userId?: number | null;
  username?: string | null;
  avatar_url?: string | null;
  accuracy?: number | null;
  beatmapDifficulty?: number | null;
  beatmapNotes?: number | null;
  beatmapTitle?: string | null;
  rank?: string | null;
};

export type RhythiaUser = {
  id: number;
  username?: string | null;
  avatar_url?: string | null;
  flag?: string | null;
  play_count?: number | null;
  skill_points?: number | null;
  position?: number | null;
};

type LeaderboardParams = {
  page: number;
  flag?: string;
  spin?: boolean;
  include_inactive?: boolean;
};

type UserScoresParams = {
  id: number;
  limit?: number;
};

type BeatmapPageParams = {
  mapId: number | string;
  limit?: number;
};

async function call<T>(endpoint: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!SESSION) {
    throw new Error(
      "RHYTHIA_SESSION env var is empty. Add your session JWT to .env before running the scraper.",
    );
  }
  const body = JSON.stringify({ session: SESSION, ...payload });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/api/${endpoint}`, {
      method: "POST",
      headers: {
        // Upstream rejects application/json.
        "content-type": "text/plain;charset=UTF-8",
        origin: "https://www.rhythia.com",
        referer: "https://www.rhythia.com/",
      },
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Rhythia /api/${endpoint} failed: ${res.status} ${res.statusText} — ${text.slice(0, 200)}`);
    }
    const text = await res.text();
    return JSON.parse(text) as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Rhythia /api/${endpoint} timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const rhythia = {
  getLeaderboard(params: LeaderboardParams) {
    return call<{
      error?: string;
      total: number;
      viewPerPage: number;
      currentPage: number;
      userPosition?: number;
      leaderboard?: RhythiaUser[];
    }>("getLeaderboard", {
      spin: false,
      include_inactive: false,
      ...params,
    });
  },

  getUserScores(params: UserScoresParams) {
    return call<{
      error?: string;
      top?: RhythiaScore[];
      lastDay?: RhythiaScore[];
      reign?: RhythiaScore[];
      stats?: Record<string, unknown>;
    }>("getUserScores", { limit: 100, ...params });
  },

  getBeatmapPageById(params: BeatmapPageParams) {
    return call<{
      error?: string;
      scores?: RhythiaScore[];
      beatmap?: RhythiaBeatmap;
    }>("getBeatmapPageById", { limit: 50, ...params });
  },

};
