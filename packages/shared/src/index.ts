export type Role = "MANAGER" | "SUPERVISOR" | "ATTENDANT";

export type Status = "OPEN" | "CLOSED";

export type FuelType = "PMS" | "AGO" | "DPK";

export const FUEL_LABELS: Record<FuelType, string> = {
  PMS: "Petrol (PMS)",
  AGO: "Diesel (AGO)",
  DPK: "Kerosene (DPK)",
};

export const FUEL_SHORT: Record<FuelType, string> = {
  PMS: "PMS",
  AGO: "AGO",
  DPK: "DPK",
};

export const ROLE_LABELS: Record<Role, string> = {
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  ATTENDANT: "Attendant",
};

export const FUEL_COLORS: Record<FuelType, string> = {
  PMS: "#f59e0b",
  AGO: "#0ea5e9",
  DPK: "#a855f7",
};

export const STATUS_COLORS: Record<Status, string> = {
  OPEN: "border-amber-400 text-amber-700",
  CLOSED: "border-emerald-400 text-emerald-700",
};

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatLitres(n: number): string {
  return `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 }).format(n)} L`;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${formatDate(date)}, ${hh}:${mm}`;
}
