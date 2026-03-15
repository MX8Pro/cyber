import { redirect } from "next/navigation";
import { ConfigRequired } from "@/components/shared/config-required";
import { resolveSystemEntryState } from "@/lib/server/bootstrap";

export default async function HomePage() {
  const entry = await resolveSystemEntryState();

  if (entry.state === "config_broken") {
    return <ConfigRequired title="التطبيق يحتاج مراجعة إعدادات Firebase قبل البدء" diagnostics={entry.diagnostics} />;
  }

  if (entry.state === "setup_required") {
    redirect("/setup");
  }

  if (entry.state === "admin_authenticated") {
    redirect("/admin/dashboard");
  }

  if (entry.state === "worker_authenticated") {
    redirect("/worker/dashboard");
  }

  redirect("/login");
}
