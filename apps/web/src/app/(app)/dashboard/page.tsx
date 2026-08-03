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
      icon: "fuel" as const,
      accent: "bg-amber-50 text-amber-600",
    },
    {
      label: "Today's Expected Revenue",
      value: formatMoney(todayRevenue),
      icon: "money" as const,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Open Shift",
      value: openShift ? "Active" : "None",
      icon: "alert" as const,
      accent: openShift ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500",
    },
    {
      label: "Active Pumps",
      value: String(pumpCount),
      icon: "gear" as const,
      accent: "bg-sky-50 text-sky-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-slate-500">
            Station overview for {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/sales" className="btn btn-primary">
          <Icon name="fuel" />
          Shift Sales
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${s.accent}`}>
              <Icon name={s.icon} className="h-5 w-5" />
            </div>
            <div className="text-lg font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Fuel Sales - Last 7 Days
            </h2>
            <span className="text-xs text-slate-400">Revenue per day</span>
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
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              Open Shift Status
            </h2>
            {openShift ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Shift</span>
                  <StatusBadge status="OPEN" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Opened by</span>
                  <span className="font-medium">{openShift.openedBy.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Pump readings</span>
                  <span className="font-medium">{openShift._count.readings}</span>
                </div>
                <Link
                  href="/sales"
                  className="btn btn-outline btn-sm mt-2 w-full"
                >
                  Continue shift
                </Link>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-slate-500">
                <p>No shift is open. Start today's shift to log pump readings.</p>
                <Link href="/sales" className="btn btn-primary btn-sm w-full">
                  Start a shift
                </Link>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Icon name="alert" className="h-4 w-4 text-rose-500" />
              Product Loss Alerts
            </h2>
            {recentLosses.length === 0 ? (
              <p className="text-sm text-slate-500">No tank losses detected.</p>
            ) : (
              <ul className="space-y-2">
                {recentLosses.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-600">
                      {FUEL_SHORT[c.tank.fuelType]} tank
                    </span>
                    <span className="font-semibold text-rose-600">
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
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="text-sm font-semibold text-slate-800">Recent Shifts</h2>
          <Link href="/sales" className="text-xs font-medium text-emerald-600 hover:underline">
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
