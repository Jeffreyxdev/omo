import type { Metadata } from "next";
import { prisma } from "@udyking/db";
import { FUEL_SHORT, formatLitres, formatDate } from "@udyking/shared";
import InventoryForm from "@/components/InventoryForm";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const user = await getSessionUser();
  const canRecord = user?.role === "MANAGER" || user?.role === "SUPERVISOR";

  const [tanks, checks] = await Promise.all([
    prisma.tank.findMany({ orderBy: { fuelType: "asc" } }),
    prisma.inventoryCheck.findMany({
      orderBy: { date: "desc" },
      take: 30,
      include: {
        tank: true,
        recordedBy: { select: { name: true } },
      },
    }),
  ]);

  const totalLoss = checks
    .filter((c) => c.varianceLitres < 0)
    .reduce((s, c) => s + Math.abs(c.varianceLitres), 0);
  const totalGain = checks
    .filter((c) => c.varianceLitres > 0)
    .reduce((s, c) => s + c.varianceLitres, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Inventory &amp; Storage Control</h1>
        <p className="page-desc mt-1">
          Record physical tank levels and compare them against pump sales to
          detect shrinkage, leaks or unrecorded discharge.
        </p>
      </div>

      {canRecord && <InventoryForm tanks={tanks} />}

      <div className="grid grid-cols-2 gap-px bg-neutral-200">
        <div className="bg-white p-4">
          <div className="section-title">Detected product loss (30 days)</div>
          <div className={`mt-1.5 text-xl font-semibold tracking-tight tnum ${totalLoss > 0 ? "text-rose-600" : "text-emerald-700"}`}>
            {formatLitres(totalLoss)}
          </div>
        </div>
        <div className="bg-white p-4">
          <div className="section-title">Unaccounted surplus (30 days)</div>
          <div className="mt-1.5 text-xl font-semibold tracking-tight tnum text-neutral-900">{formatLitres(totalGain)}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title border-b border-neutral-200 px-5 py-4">
          Inventory Check History
        </h2>
        <div className="overflow-x-auto p-2">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Date</th>
                <th className="th">Tank</th>
                <th className="th">Opening</th>
                <th className="th">Received</th>
                <th className="th">Pump Sales</th>
                <th className="th">Expected Closing</th>
                <th className="th">Actual Closing</th>
                <th className="th">Variance</th>
                <th className="th">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="td">{formatDate(c.date)}</td>
                  <td className="td">
                    <span className="font-medium text-neutral-900">
                      {FUEL_SHORT[c.tank.fuelType]} Tank
                    </span>
                  </td>
                  <td className="td">{formatLitres(c.openingLevel)}</td>
                  <td className="td">{formatLitres(c.receivedLitres)}</td>
                  <td className="td">{formatLitres(c.salesLitres)}</td>
                  <td className="td">{formatLitres(c.expectedClosing)}</td>
                  <td className="td">{formatLitres(c.closingLevel)}</td>
                  <td className="td">
                    {Math.abs(c.varianceLitres) < 0.01 ? (
                      <span className="font-medium text-emerald-600">OK</span>
                    ) : c.varianceLitres < 0 ? (
                      <span className="font-semibold text-rose-600">
                        -{formatLitres(Math.abs(c.varianceLitres))} loss
                      </span>
                    ) : (
                      <span className="font-medium text-amber-600">
                        +{formatLitres(c.varianceLitres)} surplus
                      </span>
                    )}
                  </td>
                  <td className="td">{c.recordedBy.name}</td>
                </tr>
              ))}
              {checks.length === 0 && (
                <tr>
                  <td colSpan={9} className="td text-center text-neutral-400">
                    No inventory checks recorded yet.
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
