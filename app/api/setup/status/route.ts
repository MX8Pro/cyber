import { getSetupState } from "@/lib/server/bootstrap";
import { jsonOk } from "@/lib/server/http";

export async function GET() {
  const setup = await getSetupState();
  return jsonOk(setup);
}
