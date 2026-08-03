import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@udyking/db";
import { api, json, readJson, validate } from "@/lib/api";
import { createSession } from "@/lib/session";

const schema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z.string().min(1, "Password is required"),
});

export const POST = api(async (req: NextRequest) => {
  const body = validate(schema, await readJson(req));
  const email = body.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    return json({ error: "Invalid email or password" }, 401);
  }

  await createSession(user.id, user.role);
  return json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
