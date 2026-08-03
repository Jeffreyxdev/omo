import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@udyking/db";
import { api, json, readJson, validate, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { round2 } from "@udyking/shared";

const schema = z.object({
  reconciliation: z
    .array(
      z.object({
        pumpId: z.string(),
        cashReceived: z.number().nonnegative("Cash cannot be negative"),
        posReceived: z.number().nonnegative("POS cannot be negative"),
      })
    )
    .min(1, "Reconciliation data is required"),
});

export const POST = api(async (req: NextRequest, ctx) => {
  const user = await requireUser(["MANAGER", "SUPERVISOR"]);
  const { id } = await ctx.params;
  const body = validate(schema, await readJson(req));

  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.status === "CLOSED") {
    throw new ApiError(400, "This shift is already closed");
  }

  const readings = await prisma.pumpReading.findMany({ where: { shiftId: id } });
  const readingMap = new Map(readings.map((r) => [r.pumpId, r]));
  const unknown = body.reconciliation.filter((r) => !readingMap.has(r.pumpId));
  if (unknown.length > 0) {
    throw new ApiError(400, "Save pump readings before reconciling");
  }

  for (const r of body.reconciliation) {
    const reading = readingMap.get(r.pumpId)!;
    const variance = round2(reading.expectedRevenue - r.cashReceived - r.posReceived);
    await prisma.pumpReading.update({
      where: { id: reading.id },
      data: { cashReceived: r.cashReceived, posReceived: r.posReceived, variance },
    });
  }

  const updated = await prisma.pumpReading.findMany({ where: { shiftId: id } });
  const expectedTotal = round2(updated.reduce((s, r) => s + r.expectedRevenue, 0));
  const actualTotal = round2(updated.reduce((s, r) => s + r.cashReceived + r.posReceived, 0));
  const varianceTotal = round2(updated.reduce((s, r) => s + r.variance, 0));

  const closed = await prisma.shift.update({
    where: { id },
    data: {
      status: "CLOSED",
      closedById: user.id,
      closedAt: new Date(),
      expectedTotal,
      actualTotal,
      varianceTotal,
    },
  });

  return json({ shift: closed });
});
