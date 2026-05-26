import { motion } from "motion/react";
import { Lock, CheckCircle, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MEMBERSHIP_URL = "https://infinitestudioai.com/membership";

export function UpgradeWall() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl space-y-10"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mx-auto">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold">Upgrade to Access the Studio</h1>
          <p className="text-slate-400 max-w-md mx-auto leading-relaxed text-sm">
            The Screenwriting Playbook is included with Infinite Studio membership. Join to unlock your full production pipeline.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Studio Lot */}
          <div className="rounded-2xl border border-white/12 bg-white/3 p-6 space-y-5">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">All-Access Membership</p>
              <h2 className="text-lg font-bold text-white">The Studio Lot</h2>
              <p className="text-2xl font-bold mt-2">$147<span className="text-sm font-normal text-slate-400">/quarter</span></p>
            </div>
            <ul className="space-y-2.5">
              {[
                "All Academy Courses (Live & Upcoming)",
                "2 studio productions / month",
                "10 character reference grids",
                "20 shot generations",
                "50% off the Asset Store",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-[#FF3D00] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={MEMBERSHIP_URL}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center py-2.5 rounded-lg border border-white/20 text-sm font-mono font-bold text-white hover:bg-white/8 transition-all"
            >
              Subscribe
            </a>
          </div>

          {/* Inner Circle */}
          <div className="rounded-2xl border border-[#FF3D00]/40 bg-[#FF3D00]/5 p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[8px] font-mono font-bold bg-[#FF3D00]/20 border border-[#FF3D00]/30 text-[#FF3D00] uppercase tracking-wider">
              Limited — 10 spots
            </div>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">1-on-1 Mentorship + All-Access</p>
              <h2 className="text-lg font-bold text-white">The Inner Circle</h2>
              <p className="text-2xl font-bold mt-2">$297<span className="text-sm font-normal text-slate-400">/month</span></p>
            </div>
            <ul className="space-y-2.5">
              {[
                "Everything in The Studio Lot",
                "Unlimited studio productions",
                "150 shot generations / month",
                "100% off the Asset Store",
                "Weekly 1-on-1 Mentorship (Zoom)",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-[#FF3D00] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={MEMBERSHIP_URL}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center py-2.5 rounded-lg bg-[#FF3D00] hover:bg-[#e63600] text-sm font-mono font-bold text-white transition-all"
            >
              Subscribe
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3">
          <p className="text-[11px] text-slate-600 font-mono">
            Already subscribed? Sign in with your Infinite Studio account.
          </p>
          {user && (
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-[10px] font-mono text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              Sign out ({user.email})
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
