import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@udyking/db";
import { api, json, readJson, validate, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  capacityLitres: z.number().positive().optional(),
});

export const PATCH = api(async (req: NextRequest, ctx) => {
  await requireUser(["MANAGER"]);
  const { id } = await ctx.params;
  const body = validate(patchSchema, await readJson(req));
  const tank = await prisma.tank.update({ where: { id }, data: body });
  return json({ tank });
});

export const DELETE = api(async (_req: NextRequest, ctx) => {
  await requireUser(["MANAGER"]);
  const { id } = await ctx.params;
  const checkCount = await prisma.inventoryCheck.count({ where: { tankId: id } });
  if (checkCount > 0) {
    throw new ApiError(400, "This tank has inventory history and cannot be deleted.");
  }
  await prisma.tank.delete({ where: { id } });
  return json({ ok: true });
});
