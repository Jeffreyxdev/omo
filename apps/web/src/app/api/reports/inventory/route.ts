import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@udyking/db";
import { api, json, validate } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { startOfDay, parseISODate } from "@/lib/date";

const schema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const GET = api(async (req: NextRequest) => {
  await requireUser();
  const params = validate(schema, {
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });

  const from = startOfDay(parseISODate(params.from));
  const toExclusive = new Date(parseISODate(params.to));
  toExclusive.setDate(toExclusive.getDate() + 1);

  const checks = await prisma.inventoryCheck.findMany({
    where: { date: { gte: from, lt: toExclusive } },
    orderBy: { date: "desc" },
    include: { tank: true, recordedBy: { select: { id: true, name: true } } },
  });

  const totals = checks.reduce(
    (t, c) => ({
      opening: t.opening + c.openingLevel,
      received: t.received + c.receivedLitres,
      sales: t.sales + c.salesLitres,
      closing: t.closing + c.closingLevel,
      variance: t.variance + c.varianceLitres,
    }),
    { opening: 0, received: 0, sales: 0, closing: 0, variance: 0 }
  );

  return json({ checks, totals });
});
