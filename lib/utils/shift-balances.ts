import type { ShiftRecord, TransactionRecord } from "@/types";

export function applyTransactionToBalances(
  balances: { shopCash: number; flexyCash: number },
  transaction: TransactionRecord
) {
  if (transaction.type === "note") {
    return balances;
  }

  if (transaction.treasury === "shop") {
    if (transaction.type === "shop_deposit" || transaction.type === "correction" || transaction.type === "variance") {
      return { ...balances, shopCash: balances.shopCash + transaction.amount };
    }

    if (transaction.type === "shop_withdrawal" || transaction.type === "expense") {
      return { ...balances, shopCash: balances.shopCash - transaction.amount };
    }
  }

  if (transaction.treasury === "flexy") {
    if (transaction.type === "flexy_deposit" || transaction.type === "correction" || transaction.type === "variance") {
      return { ...balances, flexyCash: balances.flexyCash + transaction.amount };
    }

    if (transaction.type === "flexy_withdrawal" || transaction.type === "expense") {
      return { ...balances, flexyCash: balances.flexyCash - transaction.amount };
    }
  }

  return balances;
}

export function calculateShiftBalances(shift: ShiftRecord | null | undefined, transactions: TransactionRecord[]) {
  if (!shift) {
    return { shopCash: 0, flexyCash: 0 };
  }

  return transactions.reduce(
    (balances, transaction) => applyTransactionToBalances(balances, transaction),
    {
      shopCash: shift.opening.openingShopCash,
      flexyCash: shift.opening.openingFlexyCash
    }
  );
}
