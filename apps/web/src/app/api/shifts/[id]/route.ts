import { prisma } from "@udyking/db";
import { api, json, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export const GET = api(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      readings: { include: { pump: true }, orderBy: { pump: { name: "asc" } } },
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
    },
  });
  if (!shift) throw new ApiError(404, "Shift not found");
  return json({ shift });
});
