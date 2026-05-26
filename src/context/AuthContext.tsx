import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { TIERS, type AccessTier, type TierName, type UsageState } from "../lib/accessTier";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  accessTier: AccessTier;
  usage: UsageState;
  trialUsed: boolean;
  refreshAccess: () => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultUsage: UsageState = {
  productions_used: 0,
  character_grids_used: 0,
  shot_generations_used: 0,
  video_promotions_used: 0,
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  accessTier: TIERS.none,
  usage: defaultUsage,
  trialUsed: false,
  refreshAccess: async () => {},
  signOut: async () => {},
});

/**
 * Derive TierName from active_subscription_tier string stored in the `users` table.
 * Matches case-insensitively against plan name patterns.
 */
function tierFromSubscriptionValue(val: string | null | undefined): TierName | null {
  if (!val) return null;
  const v = val.toLowerCase().replace(/[_\s-]/g, "");
  if (v.includes("innercircle") || v.includes("inner")) return "pro";
  // Any other active tier → standard (Studio Lot, quarterly, annual, etc.)
  return "standard";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessTier, setAccessTier] = useState<AccessTier>(TIERS.none);
  const [usage, setUsage] = useState<UsageState>(defaultUsage);
  const [trialUsed, setTrialUsed] = useState(false);
  const resolvedRef = useRef(false);

  const resolveAccess = useCallback(async (uid: string) => {
    try {
      let tier: TierName = "none";

      // ── Step 1: Check the `users` table (supabase_id = auth uid) ──
      // This is the source of truth for subscription status in the existing project.
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("active_subscription_tier")
        .eq("supabase_id", uid)
        .maybeSingle();

      if (!userErr && userRow) {
        const derivedTier = tierFromSubscriptionValue(userRow.active_subscription_tier);
        if (derivedTier) tier = derivedTier;
      }

      // ── Step 2: If still no subscription, also check app_subscriptions ──
      if (tier === "none") {
        const { data: appSub } = await supabase
          .from("app_subscriptions")
          .select("plan_name, status, amount")
          .eq("user_id", uid)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (appSub) {
          const derivedTier = tierFromSubscriptionValue(appSub.plan_name);
          if (derivedTier) {
            tier = derivedTier;
          } else if (appSub.amount && Number(appSub.amount) >= 297) {
            tier = "pro";
          } else {
            tier = "standard";
          }
        }
      }

      // ── Step 3: If still no subscription, check trial eligibility ──
      if (tier === "none") {
        // user_profiles.studio_trial_used must be explicitly false to grant trial.
        // If the table/row doesn't exist yet, default is: NO trial (user must subscribe).
        const { data: profile, error: profileErr } = await supabase
          .from("user_profiles")
          .select("studio_trial_used")
          .eq("id", uid)
          .maybeSingle();

        if (!profileErr && profile !== null && profile.studio_trial_used === false) {
          tier = "trial";
          setTrialUsed(false);
        } else {
          // No profile row means this user has not been granted a trial.
          // If profile exists with studio_trial_used = true, trial is exhausted.
          setTrialUsed(true);
          tier = "none";
        }
      }

      console.log(`[AuthContext] uid=${uid} → tier=${tier}`);
      setAccessTier(TIERS[tier]);

      // ── Step 4: Load current month usage ──
      const month = new Date().toISOString().slice(0, 7);
      const { data: usageRow } = await supabase
        .from("studio_usage")
        .select("*")
        .eq("user_id", uid)
        .eq("month", month)
        .maybeSingle();

      setUsage({
        productions_used: usageRow?.productions_used ?? 0,
        character_grids_used: usageRow?.character_grids_used ?? 0,
        shot_generations_used: usageRow?.shot_generations_used ?? 0,
        video_promotions_used: usageRow?.video_promotions_used ?? 0,
      });
    } catch (e) {
      console.error("resolveAccess error:", e);
      // On unexpected error, fail safe — deny access rather than grant it
      setAccessTier(TIERS.none);
    }
  }, []);

  const refreshAccess = useCallback(async () => {
    if (user) {
      resolvedRef.current = false;
      await resolveAccess(user.id);
    }
  }, [user, resolveAccess]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAccessTier(TIERS.none);
    setUsage(defaultUsage);
    setTrialUsed(false);
    resolvedRef.current = false;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user && !resolvedRef.current) {
        resolvedRef.current = true;
        resolveAccess(data.session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user && !resolvedRef.current) {
        resolvedRef.current = true;
        resolveAccess(sess.user.id);
      }
      if (!sess) {
        resolvedRef.current = false;
        setAccessTier(TIERS.none);
        setUsage(defaultUsage);
        setTrialUsed(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [resolveAccess]);

  return (
    <AuthContext.Provider value={{ session, user, loading, accessTier, usage, trialUsed, refreshAccess, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
