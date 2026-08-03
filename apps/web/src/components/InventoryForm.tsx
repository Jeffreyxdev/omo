"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FuelType } from "@udyking/shared";
import { FUEL_LABELS } from "@udyking/shared";
import { Icon } from "@/components/icons";

type Tank = {
  id: string;
  name: string;
  fuelType: FuelType;
  capacityLitres: number;
};

function isoToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function InventoryForm({ tanks }: { tanks: Tank[] }) {
  const router = useRouter();
  const [date, setDate] = useState(isoToday());
  const [tankId, setTankId] = useState(tanks[0]?.id ?? "");
  const [openingLevel, setOpeningLevel] = useState("");
  const [receivedLitres, setReceivedLitres] = useState("");
  const [closingLevel, setClosingLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          tankId,
          openingLevel: parseFloat(openingLevel) || 0,
          receivedLitres: parseFloat(receivedLitres) || 0,
          closingLevel: parseFloat(closingLevel) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Could not save inventory check" });
        return;
      }
      setMessage({
        type: "ok",
        text: `Inventory check saved. System sales ${data.check.salesLitres.toLocaleString("en-NG", { maximumFractionDigits: 1 })} L, variance ${data.check.varianceLitres > 0 ? "+" : ""}${data.check.varianceLitres.toLocaleString("en-NG", { maximumFractionDigits: 1 })} L.`,
      });
      setReceivedLitres("");
      setClosingLevel("");
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="section-title mb-5">Record Tank Level Check</h2>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <label className="label">Date</label>
          <input type="date" required className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Tank</label>
          <select required className="input" value={tankId} onChange={(e) => setTankId(e.target.value)}>
            {tanks.map((t) => (
              <option key={t.id} value={t.id}>
                {FUEL_LABELS[t.fuelType]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Opening Level (L)</label>
          <input
            type="number"
            required
            min="0"
            step="1"
            className="input"
            placeholder="e.g. 38500"
            value={openingLevel}
            onChange={(e) => setOpeningLevel(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Received Today (L)</label>
          <input
            type="number"
            min="0"
            step="1"
            className="input"
            placeholder="0 if none"
            value={receivedLitres}
            onChange={(e) => setReceivedLitres(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Closing Level (L)</label>
          <input
            type="number"
            required
            min="0"
            step="1"
            className="input"
            placeholder="e.g. 32000"
            value={closingLevel}
            onChange={(e) => setClosingLevel(e.target.value)}
          />
        </div>
        <div className="flex items-end sm:col-span-3 lg:col-span-5">
          <button type="submit" disabled={loading || tanks.length === 0} className="btn btn-primary">
            <Icon name="check" />
            {loading ? "Saving..." : "Save Inventory Check"}
          </button>
        </div>
      </form>
      {message && (
        <div
          className={`alert-box mt-4 ${
            message.type === "ok" ? "alert-ok" : "alert-err"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
