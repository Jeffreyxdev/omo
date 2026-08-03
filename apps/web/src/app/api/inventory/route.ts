import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@udyking/db";
import { api, json, readJson, validate, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { startOfDay, parseISODate } from "@/lib/date";
import { round2 } from "@udyking/shared";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format"),
  tankId: z.string(),
  openingLevel: z.number().nonnegative(),
  receivedLitres: z.number().nonnegative(),
  closingLevel: z.number().nonnegative(),
});

export const GET = api(async (req: NextRequest) => {
  await requireUser();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);
  const checks = await prisma.inventoryCheck.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: { tank: true, recordedBy: { select: { id: true, name: true } } },
  });
  return json({ checks });
});

export const POST = api(async (req: NextRequest) => {
  const user = await requireUser(["MANAGER", "SUPERVISOR"]);
  const body = validate(createSchema, await readJson(req));

  const tank = await prisma.tank.findUnique({ where: { id: body.tankId } });
  if (!tank) throw new ApiError(404, "Tank not found");

  const date = startOfDay(parseISODate(body.date));
  const dayEnd = new Date(date);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const readings = await prisma.pumpReading.findMany({
    where: {
      pump: { fuelType: tank.fuelType },
      shift: { date: { gte: date, lt: dayEnd } },
    },
  });
  const salesLitres = round2(readings.reduce((s, r) => s + r.litersSold, 0));
  const expectedClosing = round2(body.openingLevel + body.receivedLitres - salesLitres);
  const varianceLitres = round2(body.closingLevel - expectedClosing);

  const check = await prisma.inventoryCheck.upsert({
    where: { date_tankId: { date, tankId: tank.id } },
    update: {
      openingLevel: body.openingLevel,
      closingLevel: body.closingLevel,
      receivedLitres: body.receivedLitres,
      salesLitres,
      expectedClosing,
      varianceLitres,
      recordedById: user.id,
    },
    create: {
      date,
      tankId: tank.id,
      openingLevel: body.openingLevel,
      closingLevel: body.closingLevel,
      receivedLitres: body.receivedLitres,
      salesLitres,
      expectedClosing,
      varianceLitres,
      recordedById: user.id,
    },
    include: { tank: true },
  });

  return json({ check }, 201);
});
