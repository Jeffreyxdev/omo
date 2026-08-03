import { api, json } from "@/lib/api";
import { destroySession } from "@/lib/session";

export const POST = api(async () => {
  await destroySession();
  return json({ ok: true });
});
