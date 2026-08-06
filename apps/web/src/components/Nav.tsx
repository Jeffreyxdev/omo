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
  { href: "/inventory", label: "Inventory", icon: "tank", roles: ["MANAGER", "SUPERVISOR"] },
  { href: "/reports", label: "Reports", icon: "report", roles: ["MANAGER", "SUPERVISOR"] },
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
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center bg-neutral-900 text-white">
              <Icon name="fuel" className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight text-neutral-900">
                Udyking FIS
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                Filling Station
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-neutral-800">{user.name}</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                {ROLE_LABELS[user.role]}
              </div>
            </div>
            <button
              onClick={logout}
              className="flex h-8 w-8 items-center justify-center border border-neutral-300 text-neutral-500 transition-colors hover:border-neutral-900 hover:text-neutral-900"
              title="Sign out"
            >
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav
          className="flex items-end gap-5 overflow-x-auto"
          aria-label="Primary"
        >
          {links.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-0.5 pb-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                )}
              >
                <Icon name={l.icon} className="h-4 w-4" />
                <span className="whitespace-nowrap">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
