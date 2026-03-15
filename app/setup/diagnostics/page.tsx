import { notFound } from "next/navigation";
import { ConfigRequired } from "@/components/shared/config-required";
import { getFirebaseAdminDiagnostics } from "@/lib/server/firebase-admin";

export default function SetupDiagnosticsPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const diagnostics = getFirebaseAdminDiagnostics();

  return (
    <ConfigRequired
      title="صفحة تشخيص Firebase Admin في بيئة التطوير"
      diagnostics={diagnostics}
    />
  );
}
