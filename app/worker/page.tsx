import { redirect } from "next/navigation";
import { resolveSystemEntryState } from "@/lib/server/bootstrap";

export default async function WorkerEntryPage() {
  const entry = await resolveSystemEntryState();

  if (entry.state === "worker_authenticated") {
    redirect("/worker/dashboard");
  }

  if (entry.state === "setup_required") {
    redirect("/setup");
  }

  redirect("/worker/login");
}
