import { createHash, randomBytes, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getSetupState, invalidateSetupStateCache } from "@/lib/server/bootstrap";
import { getAdminAuthClient, getAdminDb } from "@/lib/server/firebase-admin";
import {
  APP_SETTINGS_DOC_ID,
  BOOTSTRAP_DOC_ID,
  TELEGRAM_SECRET_DOC_ID,
  TRUSTED_DEVICE_MAX_AGE_MS
} from "@/lib/server/constants";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/server/crypto";
import { nowIso } from "@/lib/server/firestore-helpers";
import { DEFAULT_SHIFT_SCHEDULE, getShiftTypeForDate } from "@/lib/utils/shift-schedule";
import { calculateProfitSummary } from "@/lib/utils/profit";
import type {
  AuditLogRecord,
  AppSettingsRecord,
  ProfitSummary,
  SessionUser,
  SetupState,
  ShiftRecord,
  ShiftOpeningContext,
  ShiftScheduleSettings,
  SyncReceiptRecord,
  TelegramNotificationType,
  TelegramSecretRecord,
  TelegramSettingsView,
  TransactionRecord,
  TrustedWorkerDeviceServerRecord,
  UserProfile,
  WorkerListItem,
  WorkerRecord
} from "@/types";

function workersCollection() {
  return getAdminDb().collection("workers");
}

function usersCollection() {
  return getAdminDb().collection("users");
}

function shiftsCollection() {
  return getAdminDb().collection("shifts");
}

function transactionsCollection() {
  return getAdminDb().collection("transactions");
}

function workerDevicesCollection() {
  return getAdminDb().collection("workerDevices");
}

function syncReceiptsCollection() {
  return getAdminDb().collection("syncReceipts");
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function sortByCreatedAtAsc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function mapDocData<T>(doc: FirebaseFirestore.QueryDocumentSnapshot): T {
  return doc.data() as T;
}

function buildDefaultSettings(updatedAt = nowIso()): AppSettingsRecord {
  return {
    id: APP_SETTINGS_DOC_ID,
    workerProfitPercentage: 50,
    shopProfitPercentage: 50,
    profitCalculationMode: "strict-flexy-separated",
    roundProfitShares: true,
    largeExpenseThreshold: 5000,
    shiftSchedule: DEFAULT_SHIFT_SCHEDULE,
    telegram: {
      enabled: false,
      chatId: "",
      botTokenMasked: null,
      notifications: [
        "worker_login",
        "shift_opened",
        "shift_closed",
        "variance_alert",
        "large_expense",
        "sync_issue",
        "profit_summary"
      ],
      updatedAt: null
    },
    updatedAt
  };
}

function normalizeShiftSchedule(schedule?: Partial<ShiftScheduleSettings> | null): ShiftScheduleSettings {
  return {
    timezone: schedule?.timezone || DEFAULT_SHIFT_SCHEDULE.timezone,
    morningStart: schedule?.morningStart || DEFAULT_SHIFT_SCHEDULE.morningStart,
    eveningStart: schedule?.eveningStart || DEFAULT_SHIFT_SCHEDULE.eveningStart,
    nightStart: schedule?.nightStart || DEFAULT_SHIFT_SCHEDULE.nightStart
  };
}

function normalizeAppSettings(settings?: Partial<AppSettingsRecord> | null): AppSettingsRecord {
  const defaults = buildDefaultSettings();
  return {
    ...defaults,
    ...settings,
    shiftSchedule: normalizeShiftSchedule(settings?.shiftSchedule),
    telegram: {
      ...defaults.telegram,
      ...(settings?.telegram ?? {})
    }
  };
}

function stripUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedFields(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, fieldValue]) => [key, stripUndefinedFields(fieldValue)])
        .filter(([, fieldValue]) => fieldValue !== undefined)
    ) as T;
  }

  return value === undefined ? (undefined as T) : value;
}

function isAuthUserNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "auth/user-not-found"
  );
}

function buildWorkerAuthEmail(workerId: string) {
  return `worker.${workerId}@workers.internal`;
}

function buildRecoveryPassword() {
  return `${randomUUID().replace(/-/g, "").slice(0, 20)}Aa1!`;
}

function hashTrustedDeviceSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function buildTrustedDeviceSecret() {
  return randomBytes(32).toString("base64url");
}

function applyTransactionToBalances(
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

function calculateExpectedBalancesForShift(shift: ShiftRecord, transactions: TransactionRecord[]) {
  return transactions.reduce(
    (balances, transaction) => applyTransactionToBalances(balances, transaction),
    {
      shopCash: shift.opening.openingShopCash,
      flexyCash: shift.opening.openingFlexyCash
    }
  );
}

async function recreateWorkerAuthAccount(
  worker: WorkerRecord,
  overrides: {
    password?: string;
    displayName?: string;
    fullName?: string;
    isActive?: boolean;
  } = {}
) {
  const authEmail = worker.authEmail || buildWorkerAuthEmail(worker.id);
  const displayName = overrides.displayName ?? worker.displayName;
  const fullName = overrides.fullName ?? worker.fullName;
  const isActive = overrides.isActive ?? worker.isActive;

  const authUser = await getAdminAuthClient().createUser({
    email: authEmail,
    password: overrides.password ?? buildRecoveryPassword(),
    displayName,
    disabled: !isActive
  });

  await getAdminAuthClient().setCustomUserClaims(authUser.uid, { role: "worker", workerId: worker.id });

  const refreshedWorkerPatch = stripUndefinedFields({
    authUid: authUser.uid,
    authEmail,
    displayName,
    fullName,
    isActive,
    updatedAt: nowIso()
  });

  const refreshedProfile: UserProfile = {
    uid: authUser.uid,
    email: authEmail,
    fullName,
    role: "worker",
    workerId: worker.id,
    isActive,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  await workersCollection().doc(worker.id).set(refreshedWorkerPatch, { merge: true });
  await usersCollection().doc(authUser.uid).set(refreshedProfile, { merge: true });

  return authUser.uid;
}

export async function createInitialAdmin(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  const bootstrapRef = getAdminDb().collection("system").doc(BOOTSTRAP_DOC_ID);
  const currentSetupState = await getSetupState();
  if (currentSetupState.initialized) {
    throw new Error("SETUP_ALREADY_COMPLETED");
  }

  const authUser = await getAdminAuthClient().createUser({
    email: input.email,
    password: input.password,
    displayName: input.fullName
  });

  await getAdminAuthClient().setCustomUserClaims(authUser.uid, { role: "admin" });

  const userProfile: UserProfile = {
    uid: authUser.uid,
    email: input.email,
    fullName: input.fullName,
    role: "admin",
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const defaultSettings = buildDefaultSettings(nowIso());

  const nextSetupState: SetupState = {
    initialized: true,
    initializedAt: nowIso(),
    initializedByUid: authUser.uid,
    configurationValid: true,
    configurationStatus: "ready",
    bootstrapVersion: 1,
    bootstrapHealth: "valid"
  };

  await usersCollection().doc(authUser.uid).set(userProfile);
  await getAdminDb().collection("settings").doc(APP_SETTINGS_DOC_ID).set(defaultSettings);
  await bootstrapRef.set(nextSetupState, { merge: true });
  invalidateSetupStateCache();

  return authUser;
}

export async function getPublicWorkerLoginList(): Promise<WorkerListItem[]> {
  const snapshot = await workersCollection().orderBy("displayName", "asc").get();
  const workers = snapshot.docs.map(mapDocData<WorkerRecord>);

  return workers
    .filter((worker: WorkerRecord) => worker.isActive && !worker.deletedAt)
    .map((worker: WorkerRecord) => ({
      id: worker.id,
      displayName: worker.displayName,
      color: worker.color,
      icon: worker.icon
    }));
}

export async function findWorkerById(workerId: string) {
  const snapshot = await workersCollection().doc(workerId).get();
  return snapshot.exists ? (snapshot.data() as WorkerRecord) : null;
}

export async function issueTrustedWorkerDevice(input: {
  worker: WorkerRecord;
  browserId: string;
  userAgent?: string;
}) {
  const deviceId = `${input.worker.id}:${input.browserId}`;
  const deviceSecret = buildTrustedDeviceSecret();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_MAX_AGE_MS).toISOString();

  const record: TrustedWorkerDeviceServerRecord = {
    id: deviceId,
    workerId: input.worker.id,
    workerAuthUid: input.worker.authUid,
    browserId: input.browserId,
    deviceSecretHash: hashTrustedDeviceSecret(deviceSecret),
    userAgent: input.userAgent,
    expiresAt,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
    revokedAt: null
  };

  await workerDevicesCollection().doc(deviceId).set(stripUndefinedFields(record), { merge: true });

  return {
    deviceId,
    browserId: input.browserId,
    deviceSecret,
    expiresAt
  };
}

export async function verifyTrustedWorkerDevice(input: {
  workerId: string;
  deviceId: string;
  browserId: string;
  deviceSecret: string;
}) {
  const snapshot = await workerDevicesCollection().doc(input.deviceId).get();
  if (!snapshot.exists) {
    throw new Error("TRUSTED_DEVICE_NOT_FOUND");
  }

  const record = snapshot.data() as TrustedWorkerDeviceServerRecord;
  if (
    record.workerId !== input.workerId ||
    record.browserId !== input.browserId ||
    record.revokedAt ||
    new Date(record.expiresAt).getTime() <= Date.now() ||
    record.deviceSecretHash !== hashTrustedDeviceSecret(input.deviceSecret)
  ) {
    throw new Error("TRUSTED_DEVICE_INVALID");
  }

  await workerDevicesCollection().doc(input.deviceId).set(
    {
      lastSeenAt: nowIso(),
      updatedAt: nowIso()
    },
    { merge: true }
  );

  return record;
}

export async function getSyncReceipt(clientMutationId: string) {
  const snapshot = await syncReceiptsCollection().doc(clientMutationId).get();
  return snapshot.exists ? (snapshot.data() as SyncReceiptRecord) : null;
}

export async function saveSyncReceipt(input: {
  id: string;
  workerId: string;
  action: SyncReceiptRecord["action"];
  entityId?: string;
}) {
  const receipt: SyncReceiptRecord = {
    id: input.id,
    workerId: input.workerId,
    action: input.action,
    status: "completed",
    createdAt: nowIso(),
    entityId: input.entityId
  };

  await syncReceiptsCollection().doc(input.id).set(stripUndefinedFields(receipt), { merge: true });
  return receipt;
}

export async function createWorkerAccount(
  actor: SessionUser,
  input: {
    fullName: string;
    displayName: string;
    password: string;
    color?: string;
    icon?: string;
    phone?: string;
    notes?: string;
    creditBalance?: number;
  }
) {
  const workerId = randomUUID();
  const authEmail = buildWorkerAuthEmail(workerId);
  const authUser = await getAdminAuthClient().createUser({
    email: authEmail,
    password: input.password,
    displayName: input.displayName,
    disabled: false
  });

  await getAdminAuthClient().setCustomUserClaims(authUser.uid, { role: "worker", workerId });

  const record: WorkerRecord = {
    id: workerId,
    authUid: authUser.uid,
    authEmail,
    fullName: input.fullName,
    displayName: input.displayName,
    role: "worker",
    isActive: true,
    color: input.color,
    icon: input.icon,
    phone: input.phone,
    notes: input.notes,
    creditBalance: input.creditBalance ?? 0,
    deletedAt: null,
    lastLoginAt: null,
    lastShiftAt: null,
    createdBy: actor.uid,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const userProfile: UserProfile = {
    uid: authUser.uid,
    email: authEmail,
    fullName: input.fullName,
    role: "worker",
    workerId,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  await workersCollection().doc(workerId).set(stripUndefinedFields(record));
  await usersCollection().doc(authUser.uid).set(userProfile);

  return record;
}

export async function updateWorkerAccount(
  workerId: string,
  updates: Partial<Pick<WorkerRecord, "fullName" | "displayName" | "phone" | "notes" | "color" | "icon" | "isActive" | "creditBalance">>
) {
  const worker = await findWorkerById(workerId);
  if (!worker) {
    throw new Error("WORKER_NOT_FOUND");
  }

  const nextWorkerState = {
    fullName: updates.fullName ?? worker.fullName,
    displayName: updates.displayName ?? worker.displayName,
    phone: updates.phone ?? worker.phone,
    notes: updates.notes ?? worker.notes,
    color: updates.color ?? worker.color,
    icon: updates.icon ?? worker.icon,
    isActive: updates.isActive ?? worker.isActive,
    creditBalance: updates.creditBalance ?? worker.creditBalance ?? 0
  };

  const patch = stripUndefinedFields({
    ...updates,
    updatedAt: nowIso()
  });

  await workersCollection().doc(workerId).set(patch, { merge: true });
  await usersCollection().doc(worker.authUid).set(
    {
      fullName: nextWorkerState.fullName,
      isActive: nextWorkerState.isActive,
      updatedAt: nowIso()
    },
    { merge: true }
  );

  if (typeof updates.isActive === "boolean" || updates.displayName || updates.fullName) {
    try {
      await getAdminAuthClient().updateUser(worker.authUid, {
        disabled: !nextWorkerState.isActive,
        displayName: nextWorkerState.displayName
      });
    } catch (error) {
      if (!isAuthUserNotFound(error)) {
        throw error;
      }

      await recreateWorkerAuthAccount(worker, {
        displayName: nextWorkerState.displayName,
        fullName: nextWorkerState.fullName,
        isActive: nextWorkerState.isActive
      });
    }
  }
}

export async function resetWorkerPassword(workerId: string, newPassword: string) {
  const worker = await findWorkerById(workerId);
  if (!worker) {
    throw new Error("WORKER_NOT_FOUND");
  }
  try {
    await getAdminAuthClient().updateUser(worker.authUid, { password: newPassword });
  } catch (error) {
    if (!isAuthUserNotFound(error)) {
      throw error;
    }

    await recreateWorkerAuthAccount(worker, { password: newPassword });
  }
}

export async function softDeleteWorker(workerId: string) {
  const worker = await findWorkerById(workerId);
  if (!worker) {
    throw new Error("WORKER_NOT_FOUND");
  }

  await workersCollection().doc(workerId).set(
    {
      isActive: false,
      deletedAt: nowIso(),
      updatedAt: nowIso()
    },
    { merge: true }
  );

  await usersCollection().doc(worker.authUid).set(
    {
      isActive: false,
      updatedAt: nowIso()
    },
    { merge: true }
  );

  try {
    await getAdminAuthClient().updateUser(worker.authUid, { disabled: true });
  } catch (error) {
    if (!isAuthUserNotFound(error)) {
      throw error;
    }
  }
}

export async function markWorkerLogin(authUid: string) {
  const userProfileSnapshot = await usersCollection().doc(authUid).get();
  if (!userProfileSnapshot.exists) {
    return null;
  }

  const userProfile = userProfileSnapshot.data() as UserProfile;
  if (userProfile.role !== "worker" || !userProfile.workerId) {
    return userProfile;
  }

  await workersCollection().doc(userProfile.workerId).set(
    {
      lastLoginAt: nowIso(),
      updatedAt: nowIso()
    },
    { merge: true }
  );

  await usersCollection().doc(authUid).set({ updatedAt: nowIso() }, { merge: true });
  return userProfile;
}

export async function listWorkersForAdmin() {
  const snapshot = await workersCollection().orderBy("createdAt", "desc").get();
  return snapshot.docs.map(mapDocData<WorkerRecord>);
}

export async function getAppSettings(): Promise<AppSettingsRecord> {
  const snapshot = await getAdminDb().collection("settings").doc(APP_SETTINGS_DOC_ID).get();
  if (!snapshot.exists) {
    return buildDefaultSettings();
  }
  return normalizeAppSettings(snapshot.data() as Partial<AppSettingsRecord>);
}

export async function updateProfitSettings(input: {
  workerProfitPercentage: number;
  shopProfitPercentage: number;
  profitCalculationMode: "strict-flexy-separated" | "basic-delta";
  roundProfitShares: boolean;
  largeExpenseThreshold: number;
  shiftSchedule: ShiftScheduleSettings;
}) {
  await getAdminDb().collection("settings").doc(APP_SETTINGS_DOC_ID).set(
    {
      ...input,
      shiftSchedule: normalizeShiftSchedule(input.shiftSchedule),
      updatedAt: nowIso()
    },
    { merge: true }
  );
}

export async function getTelegramSettingsView(): Promise<TelegramSettingsView> {
  const settings = await getAppSettings();
  return settings.telegram;
}

export async function updateTelegramSettings(input: {
  botToken?: string;
  chatId: string;
  enabled: boolean;
  notifications: TelegramNotificationType[];
}) {
  const secretRef = getAdminDb().collection("secrets").doc(TELEGRAM_SECRET_DOC_ID);
  const existingSettings = await getAppSettings();
  const normalizedBotToken = input.botToken?.trim() || undefined;
  const normalizedChatId = input.chatId.trim();
  const nextMasked = normalizedBotToken
    ? maskSecret(normalizedBotToken)
    : existingSettings.telegram.botTokenMasked;

  await getAdminDb().collection("settings").doc(APP_SETTINGS_DOC_ID).set(
    {
      telegram: {
        enabled: input.enabled,
        chatId: normalizedChatId,
        botTokenMasked: nextMasked,
        notifications: input.notifications,
        updatedAt: nowIso()
      },
      updatedAt: nowIso()
    },
    { merge: true }
  );

  if (normalizedBotToken) {
    const encrypted = encryptSecret(normalizedBotToken);
    const secret: TelegramSecretRecord = {
      ...encrypted,
      updatedAt: nowIso()
    };
    await secretRef.set(secret, { merge: true });
  }
}

export async function getTelegramBotToken() {
  const snapshot = await getAdminDb().collection("secrets").doc(TELEGRAM_SECRET_DOC_ID).get();
  if (!snapshot.exists) {
    return null;
  }

  const secret = snapshot.data() as TelegramSecretRecord;
  return decryptSecret(secret);
}

async function getLatestShift() {
  const snapshot = await shiftsCollection().orderBy("createdAt", "desc").limit(1).get();
  return snapshot.docs[0]?.data() as ShiftRecord | undefined;
}

export async function getShiftOpeningContext(): Promise<ShiftOpeningContext> {
  const settings = await getAppSettings();
  const suggestedShiftType = getShiftTypeForDate(new Date(), settings.shiftSchedule);
  const latestShift = await getLatestShift();

  if (!latestShift) {
    return {
      suggestedShiftType,
      handoverIsEstimated: false,
      hasOpenConflict: false
    };
  }

  const previousWorker = await findWorkerById(latestShift.workerId);
  const previousWorkerName = previousWorker?.displayName ?? undefined;

  if (latestShift.status === "closed" && latestShift.closing) {
    return {
      suggestedShiftType,
      previousWorkerId: latestShift.workerId,
      previousWorkerName,
      previousShiftId: latestShift.id,
      previousShiftStatus: latestShift.status,
      handoverShopCash: latestShift.closing.closingShopCash,
      handoverFlexyCash: latestShift.closing.closingFlexyCash,
      handoverIsEstimated: false,
      hasOpenConflict: false
    };
  }

  if (latestShift.status === "needs_review" && latestShift.review) {
    return {
      suggestedShiftType,
      previousWorkerId: latestShift.workerId,
      previousWorkerName,
      previousShiftId: latestShift.id,
      previousShiftStatus: latestShift.status,
      handoverShopCash: latestShift.review.expectedShopCash,
      handoverFlexyCash: latestShift.review.expectedFlexyCash,
      handoverIsEstimated: true,
      hasOpenConflict: false
    };
  }

  if (latestShift.status === "open") {
    const bundle = await getShiftWithTransactions(latestShift.id);
    const expectedBalances = bundle
      ? calculateExpectedBalancesForShift(bundle.shift, bundle.transactions)
      : {
          shopCash: latestShift.opening.openingShopCash,
          flexyCash: latestShift.opening.openingFlexyCash
        };

    return {
      suggestedShiftType,
      previousWorkerId: latestShift.workerId,
      previousWorkerName,
      previousShiftId: latestShift.id,
      previousShiftStatus: latestShift.status,
      handoverShopCash: expectedBalances.shopCash,
      handoverFlexyCash: expectedBalances.flexyCash,
      handoverIsEstimated: true,
      hasOpenConflict: true
    };
  }

  return {
    suggestedShiftType,
    previousWorkerId: latestShift.workerId,
    previousWorkerName,
    previousShiftId: latestShift.id,
    previousShiftStatus: latestShift.status,
    handoverIsEstimated: false,
    hasOpenConflict: false
  };
}

export async function getWorkerDashboard(workerId: string) {
  const worker = await findWorkerById(workerId);
  const [shiftSnapshot, recentTransactionsSnapshot] = await Promise.all([
    shiftsCollection().where("workerId", "==", workerId).get(),
    transactionsCollection().where("workerId", "==", workerId).get()
  ]);
  const shifts = shiftSnapshot.docs.map(mapDocData<ShiftRecord>);
  const transactions = recentTransactionsSnapshot.docs.map(mapDocData<TransactionRecord>);

  const activeShift = shifts.find((shift: ShiftRecord) => shift.status === "open");

  const recentTransactions = sortByCreatedAtDesc<TransactionRecord>(transactions).slice(0, 20);
  const openingContext = activeShift ? null : await getShiftOpeningContext();

  return {
    worker,
    activeShift,
    recentTransactions,
    openingContext
  };
}

export async function listAdminDashboardSummary() {
  const [workersSnapshot, shiftsSnapshot, auditSnapshot] = await Promise.all([
    workersCollection().where("deletedAt", "==", null).get(),
    shiftsCollection().orderBy("createdAt", "desc").limit(30).get(),
    getAdminDb().collection("auditLogs").orderBy("createdAt", "desc").limit(10).get()
  ]);

  const workers = workersSnapshot.docs.map(mapDocData<WorkerRecord>);
  const shifts = shiftsSnapshot.docs.map(mapDocData<ShiftRecord>);

  return {
    workers,
    shifts,
    auditLogs: auditSnapshot.docs.map(mapDocData<AuditLogRecord>)
  };
}

export async function listShiftsForAdmin() {
  const snapshot = await shiftsCollection().orderBy("createdAt", "desc").limit(100).get();
  return snapshot.docs.map(mapDocData<ShiftRecord>);
}

export async function resolveShiftReview(shiftId: string, session: SessionUser) {
  const shift = await shiftsCollection().doc(shiftId).get();
  if (!shift.exists) {
    throw new Error("SHIFT_NOT_FOUND");
  }

  const record = shift.data() as ShiftRecord;
  if (record.status !== "needs_review" || !record.review) {
    throw new Error("SHIFT_REVIEW_NOT_FOUND");
  }

  await shiftsCollection().doc(shiftId).set(
    {
      review: {
        ...record.review,
        resolvedAt: nowIso(),
        resolvedByUid: session.uid
      },
      updatedAt: nowIso()
    },
    { merge: true }
  );
}

export async function listClosedShiftReports() {
  const snapshot = await shiftsCollection().orderBy("createdAt", "desc").get();
  const shifts = snapshot.docs.map(mapDocData<ShiftRecord>);
  return shifts.filter((shift: ShiftRecord) => shift.status === "closed");
}


export async function listTransactionsForAdmin(limit = 200) {
  const snapshot = await transactionsCollection().orderBy("createdAt", "desc").limit(limit).get();
  return snapshot.docs.map(mapDocData<TransactionRecord>);
}

export async function updateTransactionForAdmin(
  transactionId: string,
  updates: Partial<Pick<TransactionRecord, "amount" | "description">>
) {
  const ref = transactionsCollection().doc(transactionId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new Error("TRANSACTION_NOT_FOUND");
  }

  const patch = stripUndefinedFields({
    amount: updates.amount,
    description: updates.description
  });

  await ref.set(patch, { merge: true });
  const updated = await ref.get();
  return updated.data() as TransactionRecord;
}

async function deleteCollectionDocs(collectionName: string) {
  const snapshot = await getAdminDb().collection(collectionName).get();
  if (!snapshot.docs.length) {
    return;
  }

  const batches: Promise<FirebaseFirestore.WriteResult[]>[] = [];
  let batch = getAdminDb().batch();
  let opCount = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    opCount += 1;
    if (opCount === 400) {
      batches.push(batch.commit());
      batch = getAdminDb().batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    batches.push(batch.commit());
  }

  await Promise.all(batches);
}

export async function resetSystemDataForDeployment() {
  const auth = getAdminAuthClient();

  let nextPageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, nextPageToken);
    nextPageToken = page.pageToken;
    await Promise.all(page.users.map((user) => auth.deleteUser(user.uid).catch(() => undefined)));
  } while (nextPageToken);

  for (const collectionName of [
    "auditLogs",
    "transactions",
    "shifts",
    "syncReceipts",
    "workerDevices",
    "workers",
    "users",
    "settings",
    "secrets",
    "system"
  ]) {
    await deleteCollectionDocs(collectionName);
  }

  invalidateSetupStateCache();
}

export async function openShiftForWorker(input: {
  session: SessionUser;
  worker: WorkerRecord;
  previousWorkerId?: string;
  openingShopCash: number;
  openingFlexyCash: number;
  notes?: string;
  clientMutationId?: string;
}) {
  const existingOpen = await getActiveShiftForWorker(input.worker.id);
  if (existingOpen) {
    if (input.clientMutationId && existingOpen.id === input.clientMutationId) {
      return existingOpen;
    }
    throw new Error("SHIFT_ALREADY_OPEN");
  }

  const settings = await getAppSettings();
  const openingContext = await getShiftOpeningContext();
  const shiftId = input.clientMutationId ?? randomUUID();
  const latestShift = openingContext.previousShiftId ? await shiftsCollection().doc(openingContext.previousShiftId).get() : null;
  const latestShiftRecord = latestShift?.exists ? (latestShift.data() as ShiftRecord) : null;

  if (latestShiftRecord?.status === "open" && latestShiftRecord.workerId !== input.worker.id) {
    await shiftsCollection().doc(latestShiftRecord.id).set(
      {
        status: "needs_review",
        review: {
          reason: "left_open_by_previous_worker",
          flaggedAt: nowIso(),
          flaggedByWorkerId: input.worker.id,
          replacementShiftId: shiftId,
          expectedShopCash: openingContext.handoverShopCash,
          expectedFlexyCash: openingContext.handoverFlexyCash
        },
        updatedAt: nowIso()
      },
      { merge: true }
    );
  }

  const shift: ShiftRecord = {
    id: shiftId,
    workerId: input.worker.id,
    workerAuthUid: input.worker.authUid,
    shiftType: getShiftTypeForDate(new Date(), settings.shiftSchedule),
    status: "open",
    opening: {
      previousWorkerId: openingContext.previousWorkerId ?? input.previousWorkerId,
      previousShiftId: openingContext.previousShiftId,
      previousShiftStatus: openingContext.previousShiftStatus,
      handoverShopCash: openingContext.handoverShopCash,
      handoverFlexyCash: openingContext.handoverFlexyCash,
      handoverIsEstimated: openingContext.handoverIsEstimated,
      openingShopCash: input.openingShopCash,
      openingFlexyCash: input.openingFlexyCash,
      openedAt: nowIso(),
      notes: input.notes
    },
    syncStatus: "synced",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  await shiftsCollection().doc(shiftId).set(stripUndefinedFields(shift));
  await workersCollection().doc(input.worker.id).set({ lastShiftAt: nowIso(), updatedAt: nowIso() }, { merge: true });
  return shift;
}

export async function getActiveShiftForWorker(workerId: string) {
  const snapshot = await shiftsCollection().where("workerId", "==", workerId).get();
  const shifts = snapshot.docs.map(mapDocData<ShiftRecord>);
  return shifts.find((shift: ShiftRecord) => shift.status === "open");
}

export async function createTransactionForWorker(input: {
  session: SessionUser;
  worker: WorkerRecord;
  shift: ShiftRecord;
  type: TransactionRecord["type"];
  treasury: TransactionRecord["treasury"];
  amount: number;
  description?: string;
  clientMutationId?: string;
}) {
  const transactionId = input.clientMutationId ?? randomUUID();
  const existingTransaction = await transactionsCollection().doc(transactionId).get();
  if (existingTransaction.exists) {
    return existingTransaction.data() as TransactionRecord;
  }

  const transaction: TransactionRecord = {
    id: transactionId,
    shiftId: input.shift.id,
    workerId: input.worker.id,
    workerAuthUid: input.worker.authUid,
    type: input.type,
    treasury: input.treasury,
    amount: input.amount,
    description: input.description,
    createdAt: nowIso(),
    syncStatus: "synced"
  };

  await transactionsCollection().doc(transactionId).set(stripUndefinedFields(transaction));
  return transaction;
}

export async function getShiftWithTransactions(shiftId: string, workerId?: string) {
  const shiftSnapshot = await shiftsCollection().doc(shiftId).get();
  if (!shiftSnapshot.exists) {
    return null;
  }

  const shift = shiftSnapshot.data() as ShiftRecord;
  if (workerId && shift.workerId !== workerId) {
    throw new Error("FORBIDDEN");
  }

  const transactionsSnapshot = await transactionsCollection()
    .where("shiftId", "==", shiftId)
    .get();

  return {
    shift,
    transactions: sortByCreatedAtAsc<TransactionRecord>(
      transactionsSnapshot.docs.map(mapDocData<TransactionRecord>)
    )
  };
}

export async function closeShiftForWorker(input: {
  session: SessionUser;
  worker: WorkerRecord;
  shift: ShiftRecord;
  closingShopCash: number;
  closingFlexyCash: number;
  notes?: string;
  nextWorkerId?: string;
  clientMutationId?: string;
}) {
  if (input.clientMutationId && input.shift.status === "closed" && input.shift.closing?.summary) {
    return input.shift.closing.summary;
  }

  const shiftBundle = await getShiftWithTransactions(input.shift.id, input.worker.id);
  if (!shiftBundle) {
    throw new Error("SHIFT_NOT_FOUND");
  }

  const settings = await getAppSettings();
  const summary: ProfitSummary = calculateProfitSummary({
    openingShopCash: input.shift.opening.openingShopCash,
    openingFlexyCash: input.shift.opening.openingFlexyCash,
    closingShopCash: input.closingShopCash,
    closingFlexyCash: input.closingFlexyCash,
    transactions: shiftBundle.transactions,
    settings
  });

  await shiftsCollection().doc(input.shift.id).set(
    stripUndefinedFields({
      status: "closed",
      closing: {
        closingShopCash: input.closingShopCash,
        closingFlexyCash: input.closingFlexyCash,
        countedAt: nowIso(),
        nextWorkerId: input.nextWorkerId,
        notes: input.notes,
        summary
      },
      updatedAt: nowIso()
    }),
    { merge: true }
  );

  return summary;
}

export async function updateWorkerLastShift(workerId: string) {
  await workersCollection().doc(workerId).set(
    {
      lastShiftAt: nowIso(),
      updatedAt: nowIso()
    },
    { merge: true }
  );
}

export async function setUserLastLogin(uid: string) {
  await usersCollection().doc(uid).set({ updatedAt: nowIso() }, { merge: true });
}

export async function revokeSession(uid: string) {
  await getAdminAuthClient().revokeRefreshTokens(uid);
}

export async function markSyncFailure(workerId: string) {
  await workersCollection().doc(workerId).set(
    {
      updatedAt: nowIso(),
      syncFailures: FieldValue.increment(1)
    },
    { merge: true }
  );
}
