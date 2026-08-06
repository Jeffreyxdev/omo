import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@udyking/db";
import { formatMoney, ROLE_LABELS, type Role } from "@udyking/shared";
import { getSessionUser } from "@/lib/session";
import OpenShiftCard from "@/components/OpenShiftCard";
import ShiftBoard from "@/components/ShiftBoard";
import StatusBadge from "@/components/StatusBadge";

export const metadata: Metadata = { title: "Shift Sales" };

export default async function SalesPage() {
  const user = await getSessionUser();
  const role = (user?.role ?? "ATTENDANT") as Role;
  const canClose = role === "MANAGER" || role === "SUPERVISOR";
  const roleGuidance =
    role === "ATTENDANT"
      ? [
          "Open the shift and enter opening/closing meter readings for each pump.",
          "Save readings so the system computes litres sold and expected revenue.",
          "Then wait for the supervisor or manager to reconcile cash and POS totals.",
        ]
      : role === "SUPERVISOR"
      ? [
          "Review the open shift status and verify pump readings.",
          "Enter cash and POS collections for each pump.",
          "Record tank dip levels and monitor volumetric variance.",
        ]
      : [
          "Review dashboard metrics and open shift status.",
          "Monitor loss alerts and staff/shift logs.",
          "Use reports for investigations and reconciliations.",
        ];

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
        <h1 className="page-title">Shift Sales</h1>
        <p className="page-desc mt-1">
          Record end-of-day pump meter readings and reconcile cash collections.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 shadow-sm sm:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-neutral-900">Shift Sales workflow</span>
            <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
              {ROLE_LABELS[role]}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {roleGuidance.map((item, index) => (
              <div key={item} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-xs font-semibold text-neutral-700">
                  {index + 1}
                </span>
                <p className="text-neutral-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            1. Readings
          </span>
          <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            2. Save
          </span>
          <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            3. Reconcile
          </span>
        </div>
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
        <h2 className="section-title border-b border-neutral-200 px-5 py-4">
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
                <tr key={s.id} className="hover:bg-neutral-50">
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
                      className="text-xs font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-500"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={8} className="td text-center text-neutral-400">
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
