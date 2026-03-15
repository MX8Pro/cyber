import { redirect } from "next/navigation";
import { resolveSystemEntryState } from "@/lib/server/bootstrap";

export default async function AdminEntryPage() {
  const entry = await resolveSystemEntryState();

  if (entry.state === "admin_authenticated") {
    redirect("/admin/dashboard");
  }

  if (entry.state === "setup_required") {
    redirect("/setup");
  }

  redirect("/admin/login");
}
