import { clearSessionCookie } from "@/lib/server/session";
import { jsonOk } from "@/lib/server/http";

export async function POST() {
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
