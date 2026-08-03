"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@udyking/shared";
import { ROLE_LABELS, cn } from "@udyking/shared";
import { Icon, type IconName } from "@/components/icons";
import type { SessionUser } from "@/lib/session";

type LinkDef = {
  href: string;
  label: string;
  icon: IconName;
  roles?: Role[];
};

const LINKS: LinkDef[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/sales", label: "Shift Sales", icon: "fuel" },
  { href: "/inventory", label: "Inventory", icon: "tank" },
  { href: "/reports", label: "Reports", icon: "report" },
  { href: "/pumps", label: "Pumps & Tanks", icon: "gear", roles: ["MANAGER", "SUPERVISOR"] },
  { href: "/users", label: "Staff", icon: "users", roles: ["MANAGER"] },
];

export default function Nav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = LINKS.filter((l) => !l.roles || l.roles.includes(user.role));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Icon name="fuel" className="h-4.5 w-4.5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900">Udyking FIS</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Filling Station System
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {links.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon name={l.icon} />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-slate-800">{user.name}</div>
            <div className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
            title="Sign out"
          >
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </header>
  );
}
