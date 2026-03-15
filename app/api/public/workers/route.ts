import { getPublicWorkerLoginList } from "@/lib/server/repositories";
import { jsonOk } from "@/lib/server/http";

export async function GET() {
  const workers = await getPublicWorkerLoginList();
  return jsonOk({ workers });
}
