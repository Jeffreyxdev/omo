import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@udyking/db";
import { api, json, readJson, validate, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

const createSchema = z.object({
  name: z.string().min(2, "Tank name is required"),
  fuelType: z.enum(["PMS", "AGO", "DPK"]),
  capacityLitres: z.number().positive("Capacity must be greater than zero"),
});

export const GET = api(async () => {
  await requireUser();
  const tanks = await prisma.tank.findMany({
    orderBy: { fuelType: "asc" },
    include: { _count: { select: { checks: true } } },
  });
  return json({ tanks });
});

export const POST = api(async (req: NextRequest) => {
  await requireUser(["MANAGER"]);
  const body = validate(createSchema, await readJson(req));
  const existing = await prisma.tank.findUnique({ where: { fuelType: body.fuelType } });
  if (existing) {
    throw new ApiError(400, "A tank for this fuel type already exists");
  }
  const tank = await prisma.tank.create({ data: body });
  return json({ tank }, 201);
});
