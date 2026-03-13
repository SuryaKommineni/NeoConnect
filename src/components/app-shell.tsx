"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, LogOut, Megaphone, MessageSquarePlus, ShieldCheck, Vote } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { cn, titleCase } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard, roles: ["staff", "secretariat", "caseManager", "admin"] },
  { href: "/submit", label: "Submit", icon: MessageSquarePlus, roles: ["staff", "secretariat", "admin"] },
  { href: "/cases", label: "Cases", icon: ShieldCheck, roles: ["staff", "secretariat", "caseManager", "admin"] },
  { href: "/hub", label: "Public Hub", icon: Megaphone, roles: ["staff", "secretariat", "caseManager", "admin"] },
  { href: "/polls", label: "Polls", icon: Vote, roles: ["staff", "secretariat", "caseManager", "admin"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["secretariat", "admin"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-slate-700">Loading workspace...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#ecfccb_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-[32px] border border-white/60 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/10">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">NeoConnect</p>
            <h1 className="mt-2 text-3xl font-semibold">Keep staff reports visible and moving.</h1>
          </div>

          <div className="mb-8 rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-slate-300">{user.name}</p>
            <p className="text-lg font-semibold">{titleCase(user.role)}</p>
            <p className="text-sm text-slate-300">{user.department}</p>
          </div>

          <nav className="space-y-2">
            {navItems
              .filter((item) => item.roles.includes(user.role))
              .map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white",
                      active && "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
          </nav>

          <div className="mt-8">
            <Button variant="outline" className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
