import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@udyking/db";
import { formatMoney, formatLitres, FUEL_SHORT } from "@udyking/shared";
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

      <div className="grid grid-cols-2 gap-px bg-neutral-200 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-5">
            <div className="section-title">{s.label}</div>
            <div className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${s.tone}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
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
