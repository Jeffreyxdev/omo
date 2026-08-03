"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

export default function OpenShiftCard({ pumpCount }: { pumpCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openShift() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shifts", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not open shift");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <Icon name="check" className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          No shift is currently open
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Open today's shift to start recording pump meter readings for{" "}
          {pumpCount} active pump{pumpCount === 1 ? "" : "s"}.
        </p>
      </div>
      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <button onClick={openShift} disabled={loading} className="btn btn-primary">
        <Icon name="fuel" />
        {loading ? "Opening..." : "Open Today's Shift"}
      </button>
    </div>
  );
}
