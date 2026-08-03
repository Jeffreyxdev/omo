"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FuelType } from "@udyking/shared";
import { FUEL_SHORT, formatLitres } from "@udyking/shared";
import { Icon } from "@/components/icons";

type Tank = {
  id: string;
  name: string;
  fuelType: FuelType;
  capacityLitres: number;
  _count: { checks: number };
};

export default function TanksManager({ tanks }: { tanks: Tank[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("PMS");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createTank(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tanks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, fuelType, capacityLitres: parseFloat(capacity) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create tank");
        return;
      }
      setName("");
      setCapacity("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTank(tank: Tank) {
    if (!confirm(`Delete ${tank.name}?`)) return;
    const res = await fetch(`/api/tanks/${tank.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Could not delete tank");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">Underground Storage Tanks</h2>
      </div>

      <form onSubmit={createTank} className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-4">
        <div>
          <label className="label">Tank name</label>
          <input
            className="input"
            placeholder="e.g. Tank 4 - PMS"
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
          <label className="label">Capacity (litres)</label>
          <input
            type="number"
            min="0"
            step="1"
            className="input"
            placeholder="e.g. 50000"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={saving} className="btn btn-primary w-full">
            <Icon name="plus" />
            Add Tank
          </button>
        </div>
      </form>

      {error && <div className="px-5 pt-3 text-sm text-rose-600">{error}</div>}

      <div className="overflow-x-auto p-2">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Tank</th>
              <th className="th">Fuel</th>
              <th className="th">Capacity</th>
              <th className="th">Checks</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tanks.map((t) => (
              <tr key={t.id}>
                <td className="td font-medium text-slate-800">{t.name}</td>
                <td className="td">
                  <span className="badge bg-sky-100 text-sky-700">{FUEL_SHORT[t.fuelType]}</span>
                </td>
                <td className="td">{formatLitres(t.capacityLitres)}</td>
                <td className="td">{t._count.checks}</td>
                <td className="td">
                  {t._count.checks === 0 && (
                    <button className="btn btn-danger btn-sm" onClick={() => deleteTank(t)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {tanks.length === 0 && (
              <tr>
                <td colSpan={5} className="td text-center text-slate-400">
                  No tanks configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
