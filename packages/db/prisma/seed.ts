import { prisma } from "../src/index";
import bcrypt from "bcryptjs";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const supervisorHash = await bcrypt.hash("supervisor123", 10);
  const attendantHash = await bcrypt.hash("attendant123", 10);

  await prisma.user.upsert({
    where: { email: "admin@udyking.com" },
    update: {},
    create: {
      name: "Station Manager",
      email: "admin@udyking.com",
      passwordHash: adminHash,
      role: "MANAGER",
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@udyking.com" },
    update: {},
    create: {
      name: "Sales Supervisor",
      email: "supervisor@udyking.com",
      passwordHash: supervisorHash,
      role: "SUPERVISOR",
    },
  });

  const attendant = await prisma.user.upsert({
    where: { email: "attendant@udyking.com" },
    update: {},
    create: {
      name: "Pump Attendant",
      email: "attendant@udyking.com",
      passwordHash: attendantHash,
      role: "ATTENDANT",
    },
  });

  const pumpDefs = [
    { name: "Pump 1 (PMS)", fuelType: "PMS" as const, pricePerLiter: 1150 },
    { name: "Pump 2 (PMS)", fuelType: "PMS" as const, pricePerLiter: 1150 },
    { name: "Pump 3 (AGO)", fuelType: "AGO" as const, pricePerLiter: 1300 },
    { name: "Pump 4 (DPK)", fuelType: "DPK" as const, pricePerLiter: 1250 },
  ];

  const pumps: { id: string; name: string; fuelType: string; pricePerLiter: number }[] = [];
  for (const def of pumpDefs) {
    const pump = await prisma.pump.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    });
    pumps.push(pump);
  }

  const tankDefs = [
    { name: "Underground Tank 1 - PMS", fuelType: "PMS" as const, capacityLitres: 50000 },
    { name: "Underground Tank 2 - AGO", fuelType: "AGO" as const, capacityLitres: 45000 },
    { name: "Underground Tank 3 - DPK", fuelType: "DPK" as const, capacityLitres: 30000 },
  ];

  const tanks: { id: string; name: string; fuelType: string; capacityLitres: number }[] = [];
  for (const def of tankDefs) {
    const tank = await prisma.tank.upsert({
      where: { fuelType: def.fuelType },
      update: {},
      create: def,
    });
    tanks.push(tank);
  }

  const existingShifts = await prisma.shift.count();
  if (existingShifts > 0) {
    console.log("Sample data already present - skipping history generation");
    console.log("Default accounts:");
    console.log("  admin@udyking.com / admin123 (Manager)");
    console.log("  supervisor@udyking.com / supervisor123 (Supervisor)");
    console.log("  attendant@udyking.com / attendant123 (Attendant)");
    return;
  }

  const baseReading: Record<string, number> = {
    [pumps[0].id]: 124500,
    [pumps[1].id]: 98600,
    [pumps[2].id]: 54200,
    [pumps[3].id]: 21300,
  };

  const today = startOfDay(new Date());

  for (let i = 7; i >= 1; i--) {
    const date = addDays(today, -i);
    const rnd = mulberry32(1000 + i);
    const openedAt = new Date(date);
    openedAt.setHours(7, 0 + Math.floor(rnd() * 40), 0, 0);
    const closedAt = new Date(date);
    closedAt.setHours(21, 0 + Math.floor(rnd() * 40), 0, 0);

    const readings = pumps.map((p) => {
      const liters = Math.round(
        (p.fuelType === "PMS" ? 3600 : p.fuelType === "AGO" ? 1500 : 900) *
          (0.75 + rnd() * 0.5)
      );
      const opening = baseReading[p.id];
      const closing = opening + liters;
      baseReading[p.id] = closing;
      const expectedRevenue = liters * p.pricePerLiter;
      const cashShare = 0.72 + rnd() * 0.16;
      const cashReceived = Math.round(expectedRevenue * cashShare);
      const variance = Math.round((rnd() - 0.5) * 400);
      const posReceived = expectedRevenue - cashReceived - variance;
      return {
        pumpId: p.id,
        openingReading: opening,
        closingReading: closing,
        litersSold: liters,
        pricePerLiter: p.pricePerLiter,
        expectedRevenue,
        cashReceived,
        posReceived,
        variance,
      };
    });

    const expectedTotal = readings.reduce((s, r) => s + r.expectedRevenue, 0);
    const actualTotal = readings.reduce((s, r) => s + r.cashReceived + r.posReceived, 0);

    await prisma.shift.create({
      data: {
        date,
        status: "CLOSED",
        openedById: attendant.id,
        closedById: supervisor.id,
        openedAt,
        closedAt,
        expectedTotal,
        actualTotal,
        varianceTotal: expectedTotal - actualTotal,
        readings: { create: readings },
      },
    });
  }

  const tankLevels: Record<string, number> = {
    PMS: 38500,
    AGO: 31200,
    DPK: 18800,
  };

  for (let i = 7; i >= 1; i--) {
    const date = addDays(today, -i);
    const rnd = mulberry32(2000 + i);

    const shifts = await prisma.shift.findMany({
      where: { date },
      include: { readings: { include: { pump: true } } },
    });
    const salesByFuel: Record<string, number> = { PMS: 0, AGO: 0, DPK: 0 };
    for (const s of shifts) {
      for (const r of s.readings) {
        salesByFuel[r.pump.fuelType] += r.litersSold;
      }
    }

    for (const tank of tanks) {
      const fuel = tank.fuelType;
      const opening = tankLevels[fuel];
      const received = i % 2 === 0 ? 0 : fuel === "PMS" ? 15000 : fuel === "AGO" ? 8000 : 5000;
      const sales = salesByFuel[fuel] ?? 0;
      const expectedClosing = opening + received - sales;
      const variance = fuel === "PMS" ? -180 - Math.round(rnd() * 120) : Math.round(rnd() * 60) - 30;
      const closing = expectedClosing + variance;
      tankLevels[fuel] = closing;

      await prisma.inventoryCheck.create({
        data: {
          date,
          tankId: tank.id,
          openingLevel: opening,
          closingLevel: closing,
          receivedLitres: received,
          salesLitres: sales,
          expectedClosing,
          varianceLitres: variance,
          recordedById: supervisor.id,
        },
      });
    }
  }

  const todayReadings = pumps.map((p) => {
    const liters = Math.round(
      (p.fuelType === "PMS" ? 3600 : p.fuelType === "AGO" ? 1500 : 900) * 0.4
    );
    const opening = baseReading[p.id];
    const closing = opening + liters;
    baseReading[p.id] = closing;
    return {
      pumpId: p.id,
      openingReading: opening,
      closingReading: closing,
      litersSold: liters,
      pricePerLiter: p.pricePerLiter,
      expectedRevenue: liters * p.pricePerLiter,
      cashReceived: 0,
      posReceived: 0,
      variance: 0,
    };
  });

  const todayExpected = todayReadings.reduce((s, r) => s + r.expectedRevenue, 0);

  await prisma.shift.create({
    data: {
      date: today,
      status: "OPEN",
      openedById: attendant.id,
      openedAt: new Date(),
      expectedTotal: todayExpected,
      readings: { create: todayReadings },
    },
  });

  console.log("Seed complete!");
  console.log("Default accounts:");
  console.log("  admin@udyking.com / admin123 (Manager)");
  console.log("  supervisor@udyking.com / supervisor123 (Supervisor)");
  console.log("  attendant@udyking.com / attendant123 (Attendant)");
  console.log("Sample data: 7 closed shifts + inventory checks, 1 open shift (today).");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
