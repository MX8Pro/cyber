import { AdminShell } from "@/components/admin/admin-shell";
import { TransactionsEditor } from "@/components/admin/transactions-editor";
import { listTransactionsForAdmin, listWorkersForAdmin } from "@/lib/server/repositories";
import { requireAdminSession } from "@/lib/server/session";

export default async function AdminTransactionsPage() {
  const session = await requireAdminSession();
  const [transactions, workers] = await Promise.all([listTransactionsForAdmin(150), listWorkersForAdmin()]);

  return (
    <AdminShell adminName={session.email}>
      <TransactionsEditor transactions={transactions} workers={workers} />
    </AdminShell>
  );
}
