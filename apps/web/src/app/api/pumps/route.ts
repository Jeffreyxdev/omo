import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@udyking/db";
import { api, json, readJson, validate, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

const createSchema = z.object({
  name: z.string().min(2, "Pump name is required"),
  fuelType: z.enum(["PMS", "AGO", "DPK"]),
  pricePerLiter: z.number().positive("Price must be greater than zero"),
});

export const GET = api(async () => {
  await requireUser();
  const pumps = await prisma.pump.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { readings: true } } },
  });
  return json({ pumps });
});

export const POST = api(async (req: NextRequest) => {
  await requireUser(["MANAGER"]);
  const body = validate(createSchema, await readJson(req));
  const existing = await prisma.pump.findUnique({ where: { name: body.name } });
  if (existing) {
    throw new ApiError(400, "A pump with this name already exists");
  }
  const pump = await prisma.pump.create({ data: body });
  return json({ pump }, 201);
});
