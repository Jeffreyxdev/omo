import { api, json } from "@/lib/api";
import { requireUser } from "@/lib/session";

export const GET = api(async () => {
  const user = await requireUser();
  return json({ user });
});
