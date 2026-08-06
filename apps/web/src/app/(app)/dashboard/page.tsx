import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@udyking/db";
import { formatMoney, formatLitres, FUEL_SHORT, ROLE_LABELS, type Role } from "@udyking/shared";
import { getSessionUser } from "@/lib/session";
import { startOfDay, addDays, isoDate, DAY_NAMES } from "@/lib/date";
import BarChart from "@/components/BarChart";
import StatusBadge from "@/components/StatusBadge";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  const today = startOfDay(new Date());
  const weekStart = addDays(today, -6);

  const [openShift, pumpCount, weekReadings, recentShifts, recentLosses, todayReadings] =
    await Promise.all([
      prisma.shift.findFirst({
        where: { status: "OPEN" },
        include: {
          openedBy: { select: { name: true } },
          _count: { select: { readings: true } },
        },
      }),
      prisma.pump.count({ where: { active: true } }),
      prisma.pumpReading.findMany({
        where: { shift: { date: { gte: weekStart } } },
        include: { pump: true, shift: true },
      }),
      prisma.shift.findMany({
        orderBy: { date: "desc" },
        take: 5,
        include: {
          openedBy: { select: { name: true } },
          closedBy: { select: { name: true } },
        },
      }),
      prisma.inventoryCheck.findMany({
        where: { varianceLitres: { lt: 0 } },
        orderBy: { date: "desc" },
        take: 4,
        include: { tank: true },
      }),
      prisma.pumpReading.findMany({
        where: { shift: { date: { gte: today } } },
        include: { pump: true },
      }),
    ]);

  const todayLiters = todayReadings.reduce((s, r) => s + r.litersSold, 0);
  const todayRevenue = todayReadings.reduce((s, r) => s + r.expectedRevenue, 0);
  const todayVariance = todayReadings.reduce((s, r) => s + r.variance, 0);

  const byDay = new Map<string, { label: string; liters: number; revenue: number }>();
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    byDay.set(isoDate(d), { label: DAY_NAMES[d.getDay()], liters: 0, revenue: 0 });
  }
  for (const r of weekReadings) {
    const key = isoDate(r.shift.date);
    const cur = byDay.get(key);
    if (cur) {
      cur.liters += r.litersSold;
      cur.revenue += r.expectedRevenue;
    }
  }
  const weekSeries = [...byDay.values()];

  const stats = [
    {
      label: "Today's Fuel Sold",
      value: formatLitres(todayLiters),
      tone: "text-neutral-900",
    },
    {
      label: "Today's Expected Revenue",
      value: formatMoney(todayRevenue),
      tone: "text-neutral-900",
    },
    {
      label: "Open Shift",
      value: openShift ? "Active" : "None",
      tone: openShift ? "text-rose-600" : "text-neutral-500",
    },
    {
      label: "Active Pumps",
      value: String(pumpCount),
      tone: "text-neutral-900",
    },
  ];

  const role = (user?.role ?? "ATTENDANT") as Role;
  const workflowActionsByRole: Record<Role, Array<{ label: string; href: string }>> = {
    ATTENDANT: [
      { label: "Log shift meter readings", href: "/sales" },
      { label: "View open shift status", href: "/dashboard" },
    ],
    SUPERVISOR: [
      { label: "Enter tank dip levels", href: "/inventory" },
      { label: "Verify cash & POS totals", href: "/sales" },
      { label: "View open shift status", href: "/dashboard" },
    ],
    MANAGER: [
      { label: "View dashboard metrics", href: "/dashboard" },
      { label: "Monitor product loss alerts", href: "/reports" },
      { label: "Query shift & staff logs", href: "/users" },
      { label: "Execute direct searches", href: "/reports" },
    ],
  };

  const roleActions = workflowActionsByRole[role] ?? [];
  const roleDescription =
    role === "ATTENDANT"
      ? "Log pump readings and track open shift status. Your saved readings will be reconciled by the supervisor."
      : role === "SUPERVISOR"
      ? "Verify cash/POS totals, enter tank dip levels, and monitor open shift status for loss alerts."
      : "Monitor KPIs, review loss alerts, and access shift and staff logs for the station.";

  const workflowStepsByRole: Record<Role, string[]> = {
    ATTENDANT: [
      "Log in and open the daily shift.",
      "Enter opening and closing meter readings for each pump.",
      "Save readings so the system computes litres sold and expected revenue.",
      "Wait for supervisor reconciliation and tank dip entry.",
    ],
    SUPERVISOR: [
      "Review the open shift status.",
      "Enter cash and POS totals for each pump.",
      "Enter underground tank closing dips.",
      "Monitor volumetric variance and loss alerts.",
    ],
    MANAGER: [
      "Review dashboard metrics and open shift status.",
      "Monitor product loss alerts and system variance reports.",
      "Query shift history and staff logs as needed.",
      "Execute direct searches for audits and investigations.",
    ],
  };

  const workflowSteps = workflowStepsByRole[role] ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">
            Welcome back, {user?.name.split(" ")[0]}
          </h1>
          <p className="page-desc mt-1">
            Station overview for{" "}
            {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/sales" className="btn btn-primary sm:self-end">
          <Icon name="fuel" className="h-4 w-4" />
          Shift Sales
        </Link>
      </div>

      <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-neutral-900">{ROLE_LABELS[role]} view</span>
            <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
              {role}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">{roleDescription}</p>
          <div className="mt-4 space-y-2">
            {workflowSteps.map((step, index) => (
              <div key={step} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700">
                  {index + 1}
                </span>
                <p className="text-neutral-600">{step}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {roleActions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className="btn btn-outline"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 bg-white p-5">
            <div className="section-title">{s.label}</div>
            <div className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums wrap-break-word ${s.tone}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="section-title">Fuel Sales — Last 7 Days</h2>
              <span className="text-[11px] uppercase tracking-wider text-neutral-400">
                Revenue per day
              </span>
            </div>
            <BarChart
              data={weekSeries.map((d) => ({
                label: d.label,
                value: d.revenue,
                formatted: formatMoney(d.revenue),
              }))}
            />
          </div>

          <div className="card p-5">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="section-title">Volume Sold — Last 7 Days</h2>
              <span className="text-[11px] uppercase tracking-wider text-neutral-400">
                Litres per day
              </span>
            </div>
            <BarChart
              data={weekSeries.map((d) => ({
                label: d.label,
                value: d.liters,
                formatted: formatLitres(d.liters),
              }))}
              color="#0ea5e9"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="section-title mb-4">Open Shift Status</h2>
            {openShift ? (
              <div className="divide-y divide-neutral-100 text-sm">
                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-500">Shift</span>
                  <StatusBadge status="OPEN" />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-500">Opened by</span>
                  <span className="font-medium">{openShift.openedBy.name}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-500">Pump readings</span>
                  <span className="font-medium tnum">{openShift._count.readings}</span>
                </div>
                <Link
                  href="/sales"
                  className="btn btn-outline btn-sm mt-4 w-full"
                >
                  Continue shift
                </Link>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-neutral-500">
                <p>No shift is open. Start today's shift to log pump readings.</p>
                <Link href="/sales" className="btn btn-primary btn-sm w-full">
                  Start a shift
                </Link>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="section-title mb-4">Product Loss Alerts</h2>
            {recentLosses.length === 0 ? (
              <p className="text-sm text-neutral-500">No tank losses detected.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {recentLosses.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-neutral-600">
                      {FUEL_SHORT[c.tank.fuelType]} tank
                    </span>
                    <span className="font-semibold tnum text-rose-600">
                      {formatLitres(Math.abs(c.varianceLitres))} loss
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="section-title">Recent Shifts</h2>
          <Link href="/sales" className="text-xs font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-500">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto p-2">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Date</th>
                <th className="th">Opened By</th>
                <th className="th">Expected</th>
                <th className="th">Actual</th>
                <th className="th">Variance</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentShifts.map((s) => (
                <tr key={s.id}>
                  <td className="td">{s.date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="td">{s.openedBy.name}</td>
                  <td className="td">{formatMoney(s.expectedTotal)}</td>
                  <td className="td">{formatMoney(s.actualTotal)}</td>
                  <td className={`td ${Math.abs(s.varianceTotal) > 0.5 ? "font-medium text-rose-600" : ""}`}>
                    {formatMoney(s.varianceTotal)}
                  </td>
                  <td className="td">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
