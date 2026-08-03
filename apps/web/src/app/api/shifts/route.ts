import type { NextRequest } from "next/server";
import { prisma } from "@udyking/db";
import { api, json, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { startOfDay } from "@/lib/date";

export const GET = api(async (req: NextRequest) => {
  await requireUser();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10), 100);
  const shifts = await prisma.shift.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
      _count: { select: { readings: true } },
    },
  });
  return json({ shifts });
});

export const POST = api(async () => {
  const user = await requireUser();
  const open = await prisma.shift.findFirst({ where: { status: "OPEN" } });
  if (open) {
    throw new ApiError(400, "A shift is already open. Close it before opening a new one.");
  }
  const shift = await prisma.shift.create({
    data: { date: startOfDay(new Date()), openedById: user.id },
  });
  return json({ shift }, 201);
});
