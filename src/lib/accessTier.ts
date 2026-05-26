export type TierName = "none" | "trial" | "standard" | "pro";

export interface AccessTier {
  tier: TierName;
  studio_productions_limit: number | null;
  character_grids_limit: number | null;
  shot_generations_limit: number | null;
  video_promotions_limit: number | null;
}

export const TIERS: Record<TierName, AccessTier> = {
  none: {
    tier: "none",
    studio_productions_limit: 0,
    character_grids_limit: 0,
    shot_generations_limit: 0,
    video_promotions_limit: 0,
  },
  trial: {
    tier: "trial",
    studio_productions_limit: 1,
    character_grids_limit: 10,
    shot_generations_limit: 20,
    video_promotions_limit: 5,
  },
  standard: {
    tier: "standard",
    studio_productions_limit: 2,
    character_grids_limit: 10,
    shot_generations_limit: 20,
    video_promotions_limit: 5,
  },
  pro: {
    tier: "pro",
    studio_productions_limit: null,
    character_grids_limit: null,
    shot_generations_limit: 150,
    video_promotions_limit: 50,
  },
};

export interface UsageState {
  productions_used: number;
  character_grids_used: number;
  shot_generations_used: number;
  video_promotions_used: number;
}

export function isUnlimited(limit: number | null): limit is null {
  return limit === null;
}

export function usageLabel(used: number, limit: number | null): string {
  if (limit === null) return "∞";
  return `${used} / ${limit}`;
}

export function isLimitReached(used: number, limit: number | null): boolean {
  if (limit === null) return false;
  return used >= limit;
}
