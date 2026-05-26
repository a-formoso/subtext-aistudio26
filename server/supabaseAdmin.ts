import { createClient } from "@supabase/supabase-js";

// Node 20 lacks native WebSocket — stub it so Supabase Realtime doesn't crash on import
if (!(globalThis as any).WebSocket) {
  (globalThis as any).WebSocket = class FakeWS {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    close() {}
  };
}

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: fetch },
});

export type TierName = "none" | "trial" | "standard" | "pro";

export interface AccessTier {
  tier: TierName;
  studio_productions_limit: number | null;
  character_grids_limit: number | null;
  shot_generations_limit: number | null;
  video_promotions_limit: number | null;
}

const TIERS: Record<TierName, AccessTier> = {
  none: { tier: "none", studio_productions_limit: 0, character_grids_limit: 0, shot_generations_limit: 0, video_promotions_limit: 0 },
  trial: { tier: "trial", studio_productions_limit: 1, character_grids_limit: 10, shot_generations_limit: 20, video_promotions_limit: 5 },
  standard: { tier: "standard", studio_productions_limit: 2, character_grids_limit: 10, shot_generations_limit: 20, video_promotions_limit: 5 },
  pro: { tier: "pro", studio_productions_limit: null, character_grids_limit: null, shot_generations_limit: 150, video_promotions_limit: 50 },
};

/**
 * Verify a Supabase JWT and return the user id.
 */
export async function verifyToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Resolve access tier for a user.
 */
export async function resolveAccessTier(userId: string): Promise<AccessTier> {
  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("*, subscription_plans(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (subs) {
    const planName: string = (subs.subscription_plans as any)?.name ?? "";
    if (planName.toLowerCase().includes("inner circle") || (subs.amount && subs.amount >= 297)) {
      return TIERS.pro;
    }
    return TIERS.standard;
  }

  // Check trial
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("studio_trial_used")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.studio_trial_used) return TIERS.trial;
  return TIERS.none;
}

export type UsageField = "character_grids_used" | "shot_generations_used" | "video_promotions_used";

/**
 * Check limit and increment usage counter. Returns false if limit reached.
 */
export async function checkAndIncrementUsage(
  userId: string,
  field: UsageField,
  tier: AccessTier
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const month = new Date().toISOString().slice(0, 7);
  const limitKey = field.replace("_used", "_limit") as keyof AccessTier;
  const limit = tier[limitKey] as number | null;

  // Upsert usage row
  await supabaseAdmin.from("studio_usage").upsert(
    { user_id: userId, month, [field]: 0 },
    { onConflict: "user_id,month", ignoreDuplicates: true }
  );

  const { data } = await supabaseAdmin
    .from("studio_usage")
    .select(field)
    .eq("user_id", userId)
    .eq("month", month)
    .single();

  const current: number = (data as any)?.[field] ?? 0;

  if (limit !== null && current >= limit) {
    return { allowed: false, used: current, limit };
  }

  await supabaseAdmin
    .from("studio_usage")
    .update({ [field]: current + 1 })
    .eq("user_id", userId)
    .eq("month", month);

  return { allowed: true, used: current + 1, limit };
}
