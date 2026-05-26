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
      // Check subscriptions table — join to subscription_plans for name
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*, subscription_plans(name)")
        .eq("user_id", uid)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      let tier: TierName = "none";
      if (subs) {
        const planName: string = (subs.subscription_plans as any)?.name ?? "";
        if (planName.toLowerCase().includes("inner circle") || (subs.amount && subs.amount >= 297)) {
          tier = "pro";
        } else {
          tier = "standard";
        }
      }

      // Check trial if no subscription
      if (tier === "none") {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("studio_trial_used")
          .eq("id", uid)
          .maybeSingle();
        const used = profile?.studio_trial_used ?? false;
        setTrialUsed(used);
        if (!used) tier = "trial";
      }

      setAccessTier(TIERS[tier]);

      // Load current month usage
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
      console.error("resolveAccess:", e);
    }
  }, []);

  const refreshAccess = useCallback(async () => {
    if (user) await resolveAccess(user.id);
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
