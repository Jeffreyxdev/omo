import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@udyking/db";
import { api, json, readJson, validate, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  pricePerLiter: z.number().positive().optional(),
  active: z.boolean().optional(),
});

export const PATCH = api(async (req: NextRequest, ctx) => {
  await requireUser(["MANAGER"]);
  const { id } = await ctx.params;
  const body = validate(patchSchema, await readJson(req));
  const pump = await prisma.pump.update({ where: { id }, data: body });
  return json({ pump });
});

export const DELETE = api(async (_req: NextRequest, ctx) => {
  await requireUser(["MANAGER"]);
  const { id } = await ctx.params;
  const readingCount = await prisma.pumpReading.count({ where: { pumpId: id } });
  if (readingCount > 0) {
    throw new ApiError(
      400,
      "This pump has sales history and cannot be deleted. Set it to inactive instead."
    );
  }
  await prisma.pump.delete({ where: { id } });
  return json({ ok: true });
});
