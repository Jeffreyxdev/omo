import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@udyking/db";
import type { Role } from "@udyking/db";
import { api, json, readJson, validate, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["MANAGER", "SUPERVISOR", "ATTENDANT"]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export const PATCH = api(async (req: NextRequest, ctx) => {
  const me = await requireUser(["MANAGER"]);
  const { id } = await ctx.params;
  const body = validate(patchSchema, await readJson(req));

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, "User not found");
  if (id === me.id && body.role && body.role !== me.role) {
    throw new ApiError(400, "You cannot change your own role");
  }

  const data: { name?: string; role?: Role; passwordHash?: string } = {};
  if (body.name) data.name = body.name;
  if (body.role) data.role = body.role;
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true },
  });
  return json({ user });
});

export const DELETE = api(async (_req: NextRequest, ctx) => {
  const me = await requireUser(["MANAGER"]);
  const { id } = await ctx.params;
  if (id === me.id) throw new ApiError(400, "You cannot delete your own account");

  const counts = await Promise.all([
    prisma.shift.count({ where: { openedById: id } }),
    prisma.shift.count({ where: { closedById: id } }),
    prisma.inventoryCheck.count({ where: { recordedById: id } }),
  ]);
  if (counts.some((c) => c > 0)) {
    throw new ApiError(400, "This user has shift or inventory records and cannot be deleted. Set their role instead.");
  }

  await prisma.user.delete({ where: { id } });
  return json({ ok: true });
});
