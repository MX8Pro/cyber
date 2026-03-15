export type UserRole = "admin" | "worker";
export type ShiftType = "morning" | "evening" | "night";
export type ShiftStatus = "open" | "closed" | "handed_over" | "needs_review";
export type TreasuryKind = "shop" | "flexy";
export type SyncStatus = "pending" | "synced" | "failed";
export type SyncActionType = "open_shift" | "create_transaction" | "close_shift";

export type TransactionType =
  | "shop_deposit"
  | "shop_withdrawal"
  | "flexy_deposit"
  | "flexy_withdrawal"
  | "expense"
  | "correction"
  | "note"
  | "variance";

export type TelegramNotificationType =
  | "worker_login"
  | "shift_opened"
  | "shift_closed"
  | "variance_alert"
  | "large_expense"
  | "sync_issue"
  | "profit_summary";

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  workerId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerRecord {
  id: string;
  authUid: string;
  authEmail: string;
  fullName: string;
  displayName: string;
  role: "worker";
  isActive: boolean;
  color?: string;
  icon?: string;
  phone?: string;
  notes?: string;
  deletedAt?: string | null;
  lastLoginAt?: string | null;
  lastShiftAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerListItem {
  id: string;
  displayName: string;
  color?: string;
  icon?: string;
}

export interface WorkerSessionCard {
  id: string;
  displayName: string;
  color?: string;
  icon?: string;
}

export interface TrustedWorkerDeviceServerRecord {
  id: string;
  workerId: string;
  workerAuthUid: string;
  browserId: string;
  deviceSecretHash: string;
  userAgent?: string;
  expiresAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string | null;
}

export interface TrustedWorkerDevicePayload {
  deviceId: string;
  browserId: string;
  workerId: string;
  deviceSecret: string;
  expiresAt: string;
}

export interface EncryptedPayloadEnvelope {
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface TrustedWorkerDeviceRecord {
  id: string;
  workerId: string;
  displayName: string;
  color?: string;
  icon?: string;
  browserId: string;
  expiresAt: string;
  lastActivatedAt: string;
  encryptedPayload: EncryptedPayloadEnvelope;
}

export interface ShiftScheduleSettings {
  timezone: string;
  morningStart: string;
  eveningStart: string;
  nightStart: string;
}

export interface ShiftOpening {
  previousWorkerId?: string;
  previousShiftId?: string;
  previousShiftStatus?: ShiftStatus;
  handoverShopCash?: number;
  handoverFlexyCash?: number;
  handoverIsEstimated?: boolean;
  openingShopCash: number;
  openingFlexyCash: number;
  openedAt: string;
  notes?: string;
}

export interface ShiftReview {
  reason: "left_open_by_previous_worker";
  flaggedAt: string;
  flaggedByWorkerId: string;
  replacementShiftId?: string;
  expectedShopCash?: number;
  expectedFlexyCash?: number;
  resolvedAt?: string;
  resolvedByUid?: string;
}

export interface ProfitSummary {
  openingShopCash: number;
  openingFlexyCash: number;
  closingShopCash: number;
  closingFlexyCash: number;
  flexyTransactionsTotal: number;
  deltaShopCash: number;
  deltaFlexyCash: number;
  grossProfit: number;
  netProfit: number;
  workerProfitShare: number;
  shopProfitShare: number;
  workerProfitPercentage: number;
  shopProfitPercentage: number;
}

export interface ShiftClosing {
  closingShopCash: number;
  closingFlexyCash: number;
  countedAt: string;
  nextWorkerId?: string;
  notes?: string;
  expectedShopCash?: number;
  expectedFlexyCash?: number;
  summary: ProfitSummary;
}

export interface ShiftRecord {
  id: string;
  workerId: string;
  workerAuthUid: string;
  shiftType: ShiftType;
  status: ShiftStatus;
  opening: ShiftOpening;
  closing?: ShiftClosing;
  review?: ShiftReview;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  shiftId: string;
  workerId: string;
  workerAuthUid: string;
  type: TransactionType;
  treasury: TreasuryKind;
  amount: number;
  description?: string;
  beforeBalance?: number;
  afterBalance?: number;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface AuditLogRecord {
  id: string;
  actorUid: string;
  actorRole: UserRole;
  entityType: "shift" | "transaction" | "worker" | "settings" | "auth" | "telegram" | "setup";
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TelegramSettingsView {
  enabled: boolean;
  chatId: string;
  botTokenMasked: string | null;
  notifications: TelegramNotificationType[];
  updatedAt: string | null;
}

export interface TelegramSecretRecord {
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
  updatedAt: string;
}

export interface AppSettingsRecord {
  id: string;
  workerProfitPercentage: number;
  shopProfitPercentage: number;
  profitCalculationMode: "strict-flexy-separated" | "basic-delta";
  roundProfitShares: boolean;
  largeExpenseThreshold: number;
  shiftSchedule: ShiftScheduleSettings;
  telegram: TelegramSettingsView;
  updatedAt: string;
}

export interface ShiftOpeningContext {
  suggestedShiftType: ShiftType;
  previousWorkerId?: string;
  previousWorkerName?: string;
  previousShiftId?: string;
  previousShiftStatus?: ShiftStatus;
  handoverShopCash?: number;
  handoverFlexyCash?: number;
  handoverIsEstimated: boolean;
  hasOpenConflict: boolean;
}

export interface WorkerDashboardSnapshot {
  workerId: string;
  worker: WorkerSessionCard;
  activeShift: ShiftRecord | null;
  activeShiftTransactions: TransactionRecord[];
  recentTransactions: TransactionRecord[];
  openingContext: ShiftOpeningContext | null;
  settings?: AppSettingsRecord;
  updatedAt: string;
}

export interface SetupState {
  initialized: boolean;
  initializedAt?: string;
  initializedByUid?: string;
  configurationValid?: boolean;
  configurationStatus?: "ready" | "missing_env" | "invalid_credentials" | "init_failed";
  bootstrapVersion?: number;
  bootstrapHealth?: "missing" | "valid" | "orphaned";
}

export interface SessionUser {
  uid: string;
  email: string;
  role: UserRole;
  workerId?: string;
}

export interface OfflineWorkerSession {
  id: string;
  workerId: string;
  displayName: string;
  color?: string;
  icon?: string;
  deviceId: string;
  browserId: string;
  deviceSecret: string;
  activatedAt: string;
  expiresAt: string;
  lastUnlockedAt: string;
}

export interface OfflineMutation {
  id: string;
  clientMutationId: string;
  workerId: string;
  action: SyncActionType;
  payload: unknown;
  createdAt: string;
  retries: number;
}

export interface OfflineCacheEntry<TValue = unknown> {
  key: string;
  workerId: string;
  value: TValue;
  updatedAt: string;
}

export interface OfflineMetaEntry<TValue = unknown> {
  key: string;
  value: TValue;
  updatedAt: string;
}

export interface SyncReceiptRecord {
  id: string;
  workerId: string;
  action: SyncActionType;
  status: "completed";
  createdAt: string;
  entityId?: string;
}
