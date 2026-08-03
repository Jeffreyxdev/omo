"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatLitres,
  formatMoney,
} from "@udyking/shared";
import BarChart from "@/components/BarChart";
import { Icon } from "@/components/icons";

type SalesPoint = {
  key: string;
  label: string;
  liters: number;
  revenue: number;
  cash: number;
  pos: number;
  variance: number;
};

type SalesData = {
  series: SalesPoint[];
  totals: { liters: number; revenue: number; cash: number; pos: number; variance: number };
};

type Check = {
  id: string;
  date: string;
  tank: { id: string; fuelType: "PMS" | "AGO" | "DPK" };
  openingLevel: number;
  receivedLitres: number;
  salesLitres: number;
  expectedClosing: number;
  closingLevel: number;
  varianceLitres: number;
};

type InventoryData = {
  checks: Check[];
  totals: { opening: number; received: number; sales: number; closing: number; variance: number };
};

type Tab = "sales" | "monthly" | "inventory";

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function ReportsView() {
  const [tab, setTab] = useState<Tab>("sales");
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [sales, setSales] = useState<SalesData | null>(null);
  const [monthly, setMonthly] = useState<SalesData | null>(null);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sRes, mRes, iRes] = await Promise.all([
        fetch(`/api/reports/sales?from=${from}&to=${to}&group=day`),
        fetch(`/api/reports/sales?from=${from}&to=${to}&group=month`),
        fetch(`/api/reports/inventory?from=${from}&to=${to}`),
      ]);
      const sData = await sRes.json().catch(() => ({}));
      const mData = await mRes.json().catch(() => ({}));
      const iData = await iRes.json().catch(() => ({}));
      if (!sRes.ok || !mRes.ok || !iRes.ok) {
        setError((sData.error ?? mData.error ?? iData.error) || "Could not load reports");
        return;
      }
      setSales(sData);
      setMonthly(mData);
      setInventory(iData);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "sales", label: "Daily Sales" },
    { id: "monthly", label: "Monthly Summary" },
    { id: "inventory", label: "Inventory" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-desc mt-1">
            Daily, monthly and inventory analysis for financial audits.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input w-40" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button onClick={load} disabled={loading} className="btn btn-primary">
            {loading ? "Loading..." : "Run Report"}
          </button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-1 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert-box alert-err flex items-center gap-2">
          <Icon name="alert" className="h-4 w-4" />
          {error}
        </div>
      )}

      {tab === "sales" && sales && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              { label: "Total Litres", value: formatLitres(sales.totals.liters) },
              { label: "Expected Revenue", value: formatMoney(sales.totals.revenue) },
              { label: "Cash Collected", value: formatMoney(sales.totals.cash) },
              { label: "POS Collected", value: formatMoney(sales.totals.pos) },
              { label: "Net Variance", value: formatMoney(sales.totals.variance) },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <div className="section-title">{s.label}</div>
                <div className="mt-1.5 truncate text-lg font-semibold tracking-tight tnum text-neutral-900">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h2 className="section-title mb-5">Revenue by Day</h2>
            <BarChart
              data={sales.series.map((d) => ({
                label: d.label,
                value: d.revenue,
                formatted: formatMoney(d.revenue),
              }))}
            />
          </div>

          <div className="card">
            <div className="overflow-x-auto p-2">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Litres</th>
                    <th className="th">Expected</th>
                    <th className="th">Cash</th>
                    <th className="th">POS</th>
                    <th className="th">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.series.map((d) => (
                    <tr key={d.key} className="hover:bg-neutral-50">
                      <td className="td font-medium text-neutral-900">{d.label}</td>
                      <td className="td">{formatLitres(d.liters)}</td>
                      <td className="td">{formatMoney(d.revenue)}</td>
                      <td className="td">{formatMoney(d.cash)}</td>
                      <td className="td">{formatMoney(d.pos)}</td>
                      <td className={`td font-semibold ${Math.abs(d.variance) > 0.5 ? "text-rose-600" : "text-emerald-600"}`}>
                        {formatMoney(d.variance)}
                      </td>
                    </tr>
                  ))}
                  {sales.series.length === 0 && (
                    <tr>
                      <td colSpan={6} className="td text-center text-neutral-400">
                        No sales in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "monthly" && monthly && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Litres", value: formatLitres(monthly.totals.liters) },
              { label: "Total Revenue", value: formatMoney(monthly.totals.revenue) },
              { label: "Total Collected", value: formatMoney(monthly.totals.cash + monthly.totals.pos) },
              { label: "Net Variance", value: formatMoney(monthly.totals.variance) },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <div className="section-title">{s.label}</div>
                <div className="mt-1.5 text-lg font-semibold tracking-tight tnum text-neutral-900">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h2 className="section-title mb-5">Revenue by Month</h2>
            <BarChart
              data={monthly.series.map((d) => ({
                label: d.label,
                value: d.revenue,
                formatted: formatMoney(d.revenue),
              }))}
            />
          </div>

          <div className="card">
            <div className="overflow-x-auto p-2">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Month</th>
                    <th className="th">Litres</th>
                    <th className="th">Revenue</th>
                    <th className="th">Cash</th>
                    <th className="th">POS</th>
                    <th className="th">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.series.map((d) => (
                    <tr key={d.key} className="hover:bg-neutral-50">
                      <td className="td font-medium text-neutral-900">{d.label}</td>
                      <td className="td">{formatLitres(d.liters)}</td>
                      <td className="td">{formatMoney(d.revenue)}</td>
                      <td className="td">{formatMoney(d.cash)}</td>
                      <td className="td">{formatMoney(d.pos)}</td>
                      <td className={`td font-semibold ${Math.abs(d.variance) > 0.5 ? "text-rose-600" : "text-emerald-600"}`}>
                        {formatMoney(d.variance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "inventory" && inventory && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              { label: "Total Opening", value: formatLitres(inventory.totals.opening) },
              { label: "Total Received", value: formatLitres(inventory.totals.received) },
              { label: "Pump Sales", value: formatLitres(inventory.totals.sales) },
              { label: "Total Closing", value: formatLitres(inventory.totals.closing) },
              { label: "Net Variance", value: formatLitres(inventory.totals.variance) },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <div className="section-title">{s.label}</div>
                <div className="mt-1.5 truncate text-lg font-semibold tracking-tight tnum text-neutral-900">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="overflow-x-auto p-2">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Fuel</th>
                    <th className="th">Opening</th>
                    <th className="th">Received</th>
                    <th className="th">Sales</th>
                    <th className="th">Expected Closing</th>
                    <th className="th">Actual Closing</th>
                    <th className="th">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.checks.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50">
                      <td className="td font-medium text-neutral-900">
                        {new Date(c.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="td">{c.tank.fuelType}</td>
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
                    </tr>
                  ))}
                  {inventory.checks.length === 0 && (
                    <tr>
                      <td colSpan={8} className="td text-center text-neutral-400">
                        No inventory checks in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
