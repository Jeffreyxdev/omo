import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@udyking/db";
import { api, json, validate } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { startOfDay, parseISODate, MONTH_NAMES } from "@/lib/date";

const schema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  group: z.enum(["day", "month"]).default("day"),
});

export const GET = api(async (req: NextRequest) => {
  await requireUser();
  const params = validate(schema, {
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
    group: req.nextUrl.searchParams.get("group") ?? "day",
  });

  const from = startOfDay(parseISODate(params.from));
  const toExclusive = new Date(parseISODate(params.to));
  toExclusive.setDate(toExclusive.getDate() + 1);

  const readings = await prisma.pumpReading.findMany({
    where: { shift: { date: { gte: from, lt: toExclusive } } },
    include: { pump: true, shift: true },
  });

  const map = new Map<
    string,
    { key: string; label: string; liters: number; revenue: number; cash: number; pos: number; variance: number }
  >();

  for (const r of readings) {
    const d = r.shift.date;
    let key: string;
    let label: string;
    if (params.group === "day") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }
    const cur = map.get(key) ?? { key, label, liters: 0, revenue: 0, cash: 0, pos: 0, variance: 0 };
    cur.liters += r.litersSold;
    cur.revenue += r.expectedRevenue;
    cur.cash += r.cashReceived;
    cur.pos += r.posReceived;
    cur.variance += r.variance;
    map.set(key, cur);
  }

  const series = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  const totals = series.reduce(
    (t, s) => ({
      liters: t.liters + s.liters,
      revenue: t.revenue + s.revenue,
      cash: t.cash + s.cash,
      pos: t.pos + s.pos,
      variance: t.variance + s.variance,
    }),
    { liters: 0, revenue: 0, cash: 0, pos: 0, variance: 0 }
  );

  return json({ series, totals });
});
