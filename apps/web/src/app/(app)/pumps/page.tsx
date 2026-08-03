import type { Metadata } from "next";
import { prisma } from "@udyking/db";
import PumpsManager from "@/components/PumpsManager";
import TanksManager from "@/components/TanksManager";

export const metadata: Metadata = { title: "Pumps & Tanks" };

export default async function PumpsPage() {
  const [pumps, tanks] = await Promise.all([
    prisma.pump.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { readings: true } } },
    }),
    prisma.tank.findMany({
      orderBy: { fuelType: "asc" },
      include: { _count: { select: { checks: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pumps &amp; Tanks</h1>
        <p className="text-sm text-slate-500">
          Configure fuel dispensers, prices and underground storage tanks.
        </p>
      </div>
      <PumpsManager pumps={pumps} />
      <TanksManager tanks={tanks} />
    </div>
  );
}
