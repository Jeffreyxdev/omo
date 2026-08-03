import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@udyking/db";
import { api, json, readJson, validate, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

const createSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["MANAGER", "SUPERVISOR", "ATTENDANT"]),
});

export const GET = api(async () => {
  await requireUser(["MANAGER"]);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  return json({ users });
});

export const POST = api(async (req: NextRequest) => {
  await requireUser(["MANAGER"]);
  const body = validate(createSchema, await readJson(req));
  const email = body.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(400, "A user with this email already exists");

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email,
      passwordHash,
      role: body.role,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return json({ user }, 201);
});
