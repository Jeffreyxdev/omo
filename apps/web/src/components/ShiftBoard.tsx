"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FuelType } from "@udyking/shared";
import { FUEL_COLORS, FUEL_LABELS, formatMoney, formatLitres, round2 } from "@udyking/shared";
import StatusBadge from "@/components/StatusBadge";
import { Icon } from "@/components/icons";
import { formatDateTime } from "@udyking/shared";

type Pump = {
  id: string;
  name: string;
  fuelType: FuelType;
  pricePerLiter: number;
};

type Reading = {
  id: string;
  pumpId: string;
  openingReading: number;
  closingReading: number;
  litersSold: number;
  pricePerLiter: number;
  expectedRevenue: number;
  cashReceived: number;
  posReceived: number;
  variance: number;
};

type Shift = {
  id: string;
  date: Date;
  status: "OPEN" | "CLOSED";
  openedAt: Date;
  openedBy: { id: string; name: string };
  readings: (Reading & { pump: Pump })[];
};

type Row = {
  pumpId: string;
  opening: string;
  closing: string;
  cash: string;
  pos: string;
  liters: number;
  revenue: number;
  saved: boolean;
};

function toRow(pump: Pump, lastClosing: Record<string, number>, existing?: Reading & { pump: Pump }): Row {
  return {
    pumpId: pump.id,
    opening: existing ? String(existing.openingReading) : String(lastClosing[pump.id] ?? 0),
    closing: existing ? String(existing.closingReading) : "",
    cash: existing && existing.cashReceived > 0 ? String(existing.cashReceived) : "",
    pos: existing && existing.posReceived > 0 ? String(existing.posReceived) : "",
    liters: existing?.litersSold ?? 0,
    revenue: existing?.expectedRevenue ?? 0,
    saved: Boolean(existing),
  };
}

export default function ShiftBoard({
  shift,
  pumps,
  lastClosing,
  canClose,
}: {
  shift: Shift;
  pumps: Pump[];
  lastClosing: Record<string, number>;
  canClose: boolean;
}) {
  const router = useRouter();
  const readingsByPump = new Map(shift.readings.map((r) => [r.pumpId, r]));
  const [rows, setRows] = useState<Row[]>(() =>
    pumps.map((p) => toRow(p, lastClosing, readingsByPump.get(p.id)))
  );
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function updateRow(pumpId: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.pumpId === pumpId ? { ...r, ...patch } : r)));
  }

  function computeRow(r: Row): Row {
    const opening = parseFloat(r.opening);
    const closing = parseFloat(r.closing);
    const valid = !isNaN(opening) && !isNaN(closing) && closing >= opening;
    const liters = valid ? round2(closing - opening) : 0;
    const pump = pumps.find((p) => p.id === r.pumpId);
    const revenue = valid && pump ? round2(liters * pump.pricePerLiter) : 0;
    return { ...r, liters, revenue };
  }

  async function saveReadings() {
    setSaving(true);
    setMessage(null);
    const readings = rows.map((r) => ({
      pumpId: r.pumpId,
      openingReading: parseFloat(r.opening) || 0,
      closingReading: parseFloat(r.closing) || 0,
    }));
    try {
      const res = await fetch(`/api/shifts/${shift.id}/readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readings }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Could not save readings" });
        return;
      }
      const saved = data.readings as Reading[];
      const byPump = new Map(saved.map((r) => [r.pumpId, r]));
      setRows((prev) =>
        prev.map((r) => {
          const s = byPump.get(r.pumpId);
          if (!s) return r;
          return {
            ...r,
            opening: String(s.openingReading),
            closing: String(s.closingReading),
            liters: s.litersSold,
            revenue: s.expectedRevenue,
            saved: true,
          };
        })
      );
      setMessage({ type: "ok", text: "Pump readings saved." });
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function closeShift() {
    if (!confirm("Close this shift and lock the reconciliation figures?")) return;
    setClosing(true);
    setMessage(null);
    const reconciliation = rows.map((r) => ({
      pumpId: r.pumpId,
      cashReceived: parseFloat(r.cash) || 0,
      posReceived: parseFloat(r.pos) || 0,
    }));
    try {
      const res = await fetch(`/api/shifts/${shift.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reconciliation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Could not close shift" });
        return;
      }
      router.push("/sales");
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Network error" });
    } finally {
      setClosing(false);
    }
  }

  const allSaved = rows.every((r) => r.saved);
  const expectedTotal = round2(rows.reduce((s, r) => s + r.revenue, 0));
  const cashTotal = round2(rows.reduce((s, r) => s + (parseFloat(r.cash) || 0), 0));
  const posTotal = round2(rows.reduce((s, r) => s + (parseFloat(r.pos) || 0), 0));
  const varianceTotal = round2(expectedTotal - cashTotal - posTotal);

  const currentStep = !allSaved
    ? "Step 1: Save all pump readings before reconciliation."
    : canClose
    ? "Step 2: Reconcile cash and POS, then close the shift."
    : "Waiting for supervisor review and shift closure.";

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                Shift {shift.date.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h2>
              <StatusBadge status={shift.status} />
            </div>
            <p className="mt-0.5 text-sm text-neutral-500">
              Opened by {shift.openedBy.name} at {formatDateTime(shift.openedAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            <div className="font-medium text-neutral-900">Current step</div>
            <p className="mt-1">{currentStep}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Pump</th>
                <th className="th">Fuel</th>
                <th className="th">Price/L</th>
                <th className="th">Opening Reading</th>
                <th className="th">Closing Reading</th>
                <th className="th">Litres Sold</th>
                <th className="th">Expected Revenue</th>
                {canClose && (
                  <>
                    <th className="th">Cash</th>
                    <th className="th">POS</th>
                    <th className="th">Variance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pump = pumps.find((p) => p.id === r.pumpId)!;
                const cash = parseFloat(r.cash) || 0;
                const pos = parseFloat(r.pos) || 0;
                const reconciled = cash > 0 || pos > 0;
                const variance = round2(r.revenue - cash - pos);
                const varianceTone = !reconciled
                  ? "text-neutral-400"
                  : Math.abs(variance) > 0.5
                    ? "text-rose-600"
                    : "text-emerald-600";
                return (
                  <tr key={r.pumpId}>
                    <td className="td font-medium text-neutral-900">{pump.name}</td>
                    <td className="td">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: FUEL_COLORS[pump.fuelType] }}
                      >
                        <span
                          className="h-2 w-2"
                          style={{ backgroundColor: FUEL_COLORS[pump.fuelType] }}
                        />
                        {FUEL_LABELS[pump.fuelType]}
                      </span>
                    </td>
                    <td className="td">{formatMoney(pump.pricePerLiter)}</td>
                    <td className="td">
                      <input
                        type="number"
                        step="0.1"
                        className="input w-32"
                        value={r.opening}
                        onChange={(e) => updateRow(r.pumpId, computeRow({ ...r, opening: e.target.value }))}
                      />
                    </td>
                    <td className="td">
                      <input
                        type="number"
                        step="0.1"
                        className="input w-32"
                        value={r.closing}
                        onChange={(e) => updateRow(r.pumpId, computeRow({ ...r, closing: e.target.value }))}
                      />
                    </td>
                    <td className="td font-medium">{formatLitres(r.liters)}</td>
                    <td className="td font-medium">{formatMoney(r.revenue)}</td>
                    {canClose && (
                      <>
                        <td className="td">
                          <input
                            type="number"
                            step="1"
                            className="input w-36"
                            value={r.cash}
                            placeholder="0"
                            onChange={(e) => updateRow(r.pumpId, { ...r, cash: e.target.value })}
                          />
                        </td>
                        <td className="td">
                          <input
                            type="number"
                            step="1"
                            className="input w-36"
                            value={r.pos}
                            placeholder="0"
                            onChange={(e) => updateRow(r.pumpId, { ...r, pos: e.target.value })}
                          />
                        </td>
                        <td className={`td font-semibold ${varianceTone}`}>
                          {formatMoney(variance)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-50">
                <td className="td font-semibold" colSpan={5}>
                  Totals
                </td>
                <td className="td font-semibold">{formatLitres(rows.reduce((s, r) => s + r.liters, 0))}</td>
                <td className="td font-semibold">{formatMoney(expectedTotal)}</td>
                {canClose && (
                  <>
                    <td className="td font-semibold">{formatMoney(cashTotal)}</td>
                    <td className="td font-semibold">{formatMoney(posTotal)}</td>
                    <td className={`td font-semibold ${
                      cashTotal > 0 || posTotal > 0
                        ? Math.abs(varianceTotal) > 0.5
                          ? "text-rose-600"
                          : "text-emerald-600"
                        : "text-neutral-400"
                    }`}>
                      {formatMoney(varianceTotal)}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>

        {message && (
          <div
            className={`alert-box mt-4 ${
              message.type === "ok" ? "alert-ok" : "alert-err"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={saveReadings} disabled={saving} className="btn btn-primary">
            {saving ? "Saving..." : "Save meter readings"}
          </button>
          {canClose && (
            <button
              onClick={closeShift}
              disabled={closing || !allSaved}
              title={allSaved ? "Close shift and lock reconciliation" : "Save all meter readings first"}
              className="btn btn-danger"
            >
              {closing ? "Closing..." : "Reconcile cash/POS & close shift"}
            </button>
          )}
          {!allSaved && canClose && (
            <span className="self-center text-xs text-neutral-400">
              Save all readings before closing the shift.
            </span>
          )}
        </div>
      </div>

      {!canClose && (
        <div className="alert-box alert-info flex items-start gap-2">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Cash and POS amounts are entered by the supervisor when closing the
            shift. Save your meter readings above when done.
          </span>
        </div>
      )}
    </div>
  );
}
