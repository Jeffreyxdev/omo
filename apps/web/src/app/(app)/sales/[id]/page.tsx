import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@udyking/db";
import {
  FUEL_LABELS,
  formatLitres,
  formatMoney,
  formatDateTime,
} from "@udyking/shared";
import StatusBadge from "@/components/StatusBadge";

export const metadata: Metadata = { title: "Shift Detail" };

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      readings: { include: { pump: true }, orderBy: { pump: { name: "asc" } } },
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
  });

  if (!shift) notFound();

  const litersTotal = shift.readings.reduce((s, r) => s + r.litersSold, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/sales" className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-900">
            &larr; Back to Shift Sales
          </Link>
          <h1 className="page-title mt-1">
            Shift Detail - {shift.date.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h1>
        </div>
        <StatusBadge status={shift.status} />
      </div>

      <div className="grid grid-cols-2 gap-px bg-neutral-200 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Opened By", value: shift.openedBy.name },
          { label: "Opened At", value: formatDateTime(shift.openedAt) },
          { label: "Closed By", value: shift.closedBy?.name ?? "-" },
          { label: "Closed At", value: shift.closedAt ? formatDateTime(shift.closedAt) : "-" },
          { label: "Total Litres", value: formatLitres(litersTotal) },
          { label: "Variance", value: formatMoney(shift.varianceTotal) },
        ].map((s) => (
          <div key={s.label} className="bg-white p-4">
            <div className="section-title">{s.label}</div>
            <div className="mt-1.5 truncate text-sm font-semibold tnum text-neutral-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="section-title border-b border-neutral-200 px-5 py-4">
          Pump Readings &amp; Reconciliation
        </h2>
        <div className="overflow-x-auto p-2">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Pump</th>
                <th className="th">Fuel</th>
                <th className="th">Opening</th>
                <th className="th">Closing</th>
                <th className="th">Litres</th>
                <th className="th">Expected</th>
                <th className="th">Cash</th>
                <th className="th">POS</th>
                <th className="th">Variance</th>
              </tr>
            </thead>
            <tbody>
              {shift.readings.map((r) => (
                <tr key={r.id}>
                  <td className="td font-medium text-neutral-900">{r.pump.name}</td>
                  <td className="td">{FUEL_LABELS[r.pump.fuelType]}</td>
                  <td className="td">{r.openingReading.toLocaleString("en-NG", { maximumFractionDigits: 1 })}</td>
                  <td className="td">{r.closingReading.toLocaleString("en-NG", { maximumFractionDigits: 1 })}</td>
                  <td className="td font-medium">{formatLitres(r.litersSold)}</td>
                  <td className="td">{formatMoney(r.expectedRevenue)}</td>
                  <td className="td">{formatMoney(r.cashReceived)}</td>
                  <td className="td">{formatMoney(r.posReceived)}</td>
                  <td className={`td font-semibold ${Math.abs(r.variance) > 0.5 ? "text-rose-600" : "text-emerald-600"}`}>
                    {formatMoney(r.variance)}
                  </td>
                </tr>
              ))}
              {shift.readings.length === 0 && (
                <tr>
                  <td colSpan={9} className="td text-center text-neutral-400">
                    No readings recorded.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-50">
                <td className="td font-semibold" colSpan={4}>Totals</td>
                <td className="td font-semibold">{formatLitres(litersTotal)}</td>
                <td className="td font-semibold">{formatMoney(shift.expectedTotal)}</td>
                <td className="td font-semibold">{formatMoney(shift.readings.reduce((s, r) => s + r.cashReceived, 0))}</td>
                <td className="td font-semibold">{formatMoney(shift.readings.reduce((s, r) => s + r.posReceived, 0))}</td>
                <td className={`td font-semibold ${Math.abs(shift.varianceTotal) > 0.5 ? "text-rose-600" : "text-emerald-600"}`}>
                  {formatMoney(shift.varianceTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
