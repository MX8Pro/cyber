import { AdminShell } from "@/components/admin/admin-shell";
import { TelegramSettingsForm } from "@/components/admin/telegram-settings-form";
import { getTelegramSettingsView } from "@/lib/server/repositories";
import { requireAdminSession } from "@/lib/server/session";

export default async function AdminTelegramSettingsPage() {
  const session = await requireAdminSession();
  const settings = await getTelegramSettingsView();

  return (
    <AdminShell adminName={session.email}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">إعدادات Telegram</h1>
          <p className="text-sm text-slate-500">
            يتم إخفاء التوكن بعد الحفظ، والإرسال الفعلي لا يتم إلا من الخادم.
          </p>
        </div>
        <TelegramSettingsForm settings={settings} />
      </div>
    </AdminShell>
  );
}
