import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@udyking/db";
import { api, json, readJson, validate, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { round2 } from "@udyking/shared";

const schema = z.object({
  readings: z
    .array(
      z.object({
        pumpId: z.string(),
        openingReading: z.number().nonnegative(),
        closingReading: z.number().nonnegative(),
      })
    )
    .min(1, "At least one pump reading is required"),
});

export const POST = api(async (req: NextRequest, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const body = validate(schema, await readJson(req));

  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.status === "CLOSED") {
    throw new ApiError(400, "This shift is already closed");
  }

  const pumps = await prisma.pump.findMany({ where: { id: { in: body.readings.map((r) => r.pumpId) } } });
  const pumpMap = new Map(pumps.map((p) => [p.id, p]));

  const saved = [];
  for (const r of body.readings) {
    const pump = pumpMap.get(r.pumpId);
    if (!pump) throw new ApiError(400, "Unknown pump");
    if (!pump.active) throw new ApiError(400, `${pump.name} is inactive`);
    if (r.closingReading < r.openingReading) {
      throw new ApiError(400, `Closing reading cannot be less than opening reading on ${pump.name}`);
    }
    const litersSold = round2(r.closingReading - r.openingReading);
    const expectedRevenue = round2(litersSold * pump.pricePerLiter);
    const reading = await prisma.pumpReading.upsert({
      where: { shiftId_pumpId: { shiftId: id, pumpId: pump.id } },
      update: {
        openingReading: r.openingReading,
        closingReading: r.closingReading,
        litersSold,
        pricePerLiter: pump.pricePerLiter,
        expectedRevenue,
      },
      create: {
        shiftId: id,
        pumpId: pump.id,
        openingReading: r.openingReading,
        closingReading: r.closingReading,
        litersSold,
        pricePerLiter: pump.pricePerLiter,
        expectedRevenue,
      },
    });
    saved.push(reading);
  }

  const all = await prisma.pumpReading.findMany({
    where: { shiftId: id },
    include: { pump: true },
  });
  const expectedTotal = round2(all.reduce((s, x) => s + x.expectedRevenue, 0));
  await prisma.shift.update({ where: { id }, data: { expectedTotal } });

  return json({ readings: saved, expectedTotal });
});
