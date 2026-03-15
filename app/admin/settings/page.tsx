import { AdminShell } from "@/components/admin/admin-shell";
import { ProfitSettingsForm } from "@/components/admin/profit-settings-form";
import { getAppSettings } from "@/lib/server/repositories";
import { requireAdminSession } from "@/lib/server/session";

export default async function AdminSettingsPage() {
  const session = await requireAdminSession();
  const settings = await getAppSettings();

  return (
    <AdminShell adminName={session.email}>
      <ProfitSettingsForm
        values={{
          workerProfitPercentage: settings.workerProfitPercentage,
          shopProfitPercentage: settings.shopProfitPercentage,
          profitCalculationMode: settings.profitCalculationMode,
          roundProfitShares: settings.roundProfitShares,
          largeExpenseThreshold: settings.largeExpenseThreshold,
          shiftSchedule: settings.shiftSchedule
        }}
      />
    </AdminShell>
  );
}
