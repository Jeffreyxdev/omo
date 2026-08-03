"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FuelType } from "@udyking/shared";
import { FUEL_COLORS, FUEL_LABELS, formatMoney } from "@udyking/shared";
import { Icon } from "@/components/icons";

type Pump = {
  id: string;
  name: string;
  fuelType: FuelType;
  pricePerLiter: number;
  active: boolean;
  _count: { readings: number };
};

export default function PumpsManager({ pumps }: { pumps: Pump[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("PMS");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  async function createPump(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/pumps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, fuelType, pricePerLiter: parseFloat(price) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create pump");
        return;
      }
      setName("");
      setPrice("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function savePrice(pump: Pump) {
    const res = await fetch(`/api/pumps/${pump.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pricePerLiter: parseFloat(editPrice) }),
    });
    if (res.ok) {
      setEditingId(null);
      router.refresh();
    }
  }

  async function toggleActive(pump: Pump) {
    await fetch(`/api/pumps/${pump.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !pump.active }),
    });
    router.refresh();
  }

  async function deletePump(pump: Pump) {
    if (!confirm(`Delete ${pump.name}?`)) return;
    const res = await fetch(`/api/pumps/${pump.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Could not delete pump");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="section-title">Fuel Dispenser Pumps</h2>
      </div>

      <form onSubmit={createPump} className="grid gap-3 border-b border-neutral-100 p-5 sm:grid-cols-4">
        <div>
          <label className="label">Pump name</label>
          <input
            className="input"
            placeholder="e.g. Pump 5 (PMS)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Fuel type</label>
          <select className="input" value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)}>
            <option value="PMS">Petrol (PMS)</option>
            <option value="AGO">Diesel (AGO)</option>
            <option value="DPK">Kerosene (DPK)</option>
          </select>
        </div>
        <div>
          <label className="label">Price per litre (NGN)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            placeholder="e.g. 1150"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={saving} className="btn btn-primary w-full">
            <Icon name="plus" />
            Add Pump
          </button>
        </div>
      </form>

      {error && <div className="px-5 pt-3 text-sm text-rose-600">{error}</div>}

      <div className="overflow-x-auto p-2">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Pump</th>
              <th className="th">Fuel</th>
              <th className="th">Price / L</th>
              <th className="th">Readings</th>
              <th className="th">Status</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pumps.map((p) => (
              <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                <td className="td font-medium text-neutral-900">{p.name}</td>
                <td className="td">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: FUEL_COLORS[p.fuelType] }}>
                    <span className="h-2 w-2" style={{ backgroundColor: FUEL_COLORS[p.fuelType] }} />
                    {FUEL_LABELS[p.fuelType]}
                  </span>
                </td>
                <td className="td">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        className="input w-28"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => savePrice(p)}>
                        Save
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-500"
                      onClick={() => {
                        setEditingId(p.id);
                        setEditPrice(String(p.pricePerLiter));
                      }}
                    >
                      {formatMoney(p.pricePerLiter)}
                    </button>
                  )}
                </td>
                <td className="td">{p._count.readings}</td>
                <td className="td">
                  <span className={`badge ${p.active ? "border-emerald-400 text-emerald-700" : "border-neutral-300 text-neutral-500"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <button className="btn btn-outline btn-sm" onClick={() => toggleActive(p)}>
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                    {p._count.readings === 0 && (
                      <button className="btn btn-danger btn-sm" onClick={() => deletePump(p)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pumps.length === 0 && (
              <tr>
                <td colSpan={6} className="td text-center text-neutral-400">
                  No pumps configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
