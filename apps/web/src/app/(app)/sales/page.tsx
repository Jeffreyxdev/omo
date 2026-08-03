import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@udyking/db";
import { formatMoney } from "@udyking/shared";
import { getSessionUser } from "@/lib/session";
import OpenShiftCard from "@/components/OpenShiftCard";
import ShiftBoard from "@/components/ShiftBoard";
import StatusBadge from "@/components/StatusBadge";

export const metadata: Metadata = { title: "Shift Sales" };

export default async function SalesPage() {
  const user = await getSessionUser();
  const canClose = user?.role === "MANAGER" || user?.role === "SUPERVISOR";

  const [openShift, pumps, history, lastReadings] = await Promise.all([
    prisma.shift.findFirst({
      where: { status: "OPEN" },
      include: {
        readings: { include: { pump: true } },
        openedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.pump.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.shift.findMany({
      where: { status: "CLOSED" },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        readings: true,
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
    }),
    prisma.pumpReading.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const lastClosing = new Map<string, number>();
  for (const r of lastReadings) {
    if (!lastClosing.has(r.pumpId)) lastClosing.set(r.pumpId, r.closingReading);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shift Sales</h1>
        <p className="text-sm text-slate-500">
          Record end-of-day pump meter readings and reconcile cash collections.
        </p>
      </div>

      {openShift ? (
        <ShiftBoard
          shift={openShift}
          pumps={pumps}
          lastClosing={Object.fromEntries(lastClosing)}
          canClose={canClose}
        />
      ) : (
        <OpenShiftCard pumpCount={pumps.length} />
      )}

      <div className="card">
        <h2 className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-800">
          Shift History
        </h2>
        <div className="overflow-x-auto p-2">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Date</th>
                <th className="th">Opened By</th>
                <th className="th">Closed By</th>
                <th className="th">Expected</th>
                <th className="th">Actual</th>
                <th className="th">Variance</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="td">{s.date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="td">{s.openedBy.name}</td>
                  <td className="td">{s.closedBy?.name ?? "-"}</td>
                  <td className="td">{formatMoney(s.expectedTotal)}</td>
                  <td className="td">{formatMoney(s.actualTotal)}</td>
                  <td className={`td ${Math.abs(s.varianceTotal) > 0.5 ? "font-medium text-rose-600" : ""}`}>
                    {formatMoney(s.varianceTotal)}
                  </td>
                  <td className="td">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="td">
                    <Link
                      href={`/sales/${s.id}`}
                      className="text-xs font-medium text-emerald-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={8} className="td text-center text-slate-400">
                    No closed shifts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
