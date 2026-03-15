import { DEFAULT_SHOP_SHARE, DEFAULT_WORKER_SHARE } from "@/lib/constants/app";
import type { AppSettingsRecord, ProfitSummary, TransactionRecord } from "@/types";

interface CalculateProfitInput {
  openingShopCash: number;
  openingFlexyCash: number;
  closingShopCash: number;
  closingFlexyCash: number;
  transactions: TransactionRecord[];
  settings?: Partial<AppSettingsRecord>;
}

function roundIfNeeded(value: number, enabled: boolean) {
  return enabled ? Math.round(value) : Number(value.toFixed(2));
}

function calculateFlexyTransactionsTotal(transactions: TransactionRecord[]) {
  return transactions
    .filter((transaction) => transaction.treasury === "flexy")
    .reduce((sum, transaction) => {
      if (transaction.type === "flexy_withdrawal") {
        return sum - transaction.amount;
      }

      if (transaction.type === "flexy_deposit") {
        return sum + transaction.amount;
      }

      return sum;
    }, 0);
}

export function calculateProfitSummary({
  openingShopCash,
  openingFlexyCash,
  closingShopCash,
  closingFlexyCash,
  transactions,
  settings
}: CalculateProfitInput): ProfitSummary {
  const workerPercentage = settings?.workerProfitPercentage ?? DEFAULT_WORKER_SHARE;
  const shopPercentage = settings?.shopProfitPercentage ?? DEFAULT_SHOP_SHARE;
  const shouldRound = settings?.roundProfitShares ?? true;
  const calculationMode = settings?.profitCalculationMode ?? "strict-flexy-separated";

  const flexyTransactionsTotal = calculateFlexyTransactionsTotal(transactions);
  const deltaShopCash = closingShopCash - openingShopCash;
  const deltaFlexyCash = closingFlexyCash - openingFlexyCash;

  // في الوضع الصارم:
  // الفائدة تعتمد على فرق المحل فقط.
  // أموال الفليكسي تبقى مفصولة وتُعرض للمراجعة دون أن تدخل في الفائدة.
  const strictProfitBase = deltaShopCash;

  // الوضع البديل يبقي السلوك الحسابي الأبسط للمراجعات الإدارية عند الحاجة.
  const basicDeltaProfitBase = deltaShopCash + deltaFlexyCash;

  const grossProfit = calculationMode === "basic-delta" ? basicDeltaProfitBase : strictProfitBase;
  const netProfit = grossProfit;

  const workerProfitShare = roundIfNeeded((netProfit * workerPercentage) / 100, shouldRound);
  const shopProfitShare = roundIfNeeded((netProfit * shopPercentage) / 100, shouldRound);

  return {
    openingShopCash,
    openingFlexyCash,
    closingShopCash,
    closingFlexyCash,
    flexyTransactionsTotal,
    deltaShopCash,
    deltaFlexyCash,
    grossProfit,
    netProfit,
    workerProfitShare,
    shopProfitShare,
    workerProfitPercentage: workerPercentage,
    shopProfitPercentage: shopPercentage
  };
}
