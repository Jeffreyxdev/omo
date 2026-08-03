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
    <div className="card flex flex-col items-center gap-4 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center border border-neutral-300 text-neutral-900">
        <Icon name="check" className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
          No shift is currently open
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Open today's shift to start recording pump meter readings for{" "}
          {pumpCount} active pump{pumpCount === 1 ? "" : "s"}.
        </p>
      </div>
      {error && <div className="alert-box alert-err">{error}</div>}
      <button onClick={openShift} disabled={loading} className="btn btn-primary">
        <Icon name="fuel" className="h-4 w-4" />
        {loading ? "Opening..." : "Open Today's Shift"}
      </button>
    </div>
  );
}
