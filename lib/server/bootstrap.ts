import { BOOTSTRAP_DOC_ID } from "@/lib/server/constants";
import { getAdminAuthClient, getAdminDb, getFirebaseAdminDiagnostics } from "@/lib/server/firebase-admin";
import { getSessionUser } from "@/lib/server/session";
import type { SessionUser, SetupState, UserProfile } from "@/types";

export type SystemEntryState =
  | "config_broken"
  | "setup_required"
  | "admin_authenticated"
  | "worker_authenticated"
  | "ready_no_session";

export interface SystemEntryResolution {
  state: SystemEntryState;
  diagnostics: ReturnType<typeof getFirebaseAdminDiagnostics>;
  setup: SetupState;
  session: SessionUser | null;
}

async function getBootstrapDoc() {
  return getAdminDb().collection("system").doc(BOOTSTRAP_DOC_ID).get();
}

async function getUserProfile(uid: string) {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  return snapshot.exists ? (snapshot.data() as UserProfile) : null;
}

async function hasValidAdminInAuth(uid: string) {
  try {
    const authClient = getAdminAuthClient() as unknown as {
      getUser(uid: string): Promise<{ disabled?: boolean; customClaims?: Record<string, unknown> }>;
    };
    const authUser = await authClient.getUser(uid);
    return !authUser.disabled && authUser.customClaims?.role === "admin";
  } catch {
    return false;
  }
}

async function isValidAdminUser(uid: string) {
  const profile = await getUserProfile(uid);
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return false;
  }

  return hasValidAdminInAuth(uid);
}

async function findAnyValidAdminUid() {
  const snapshot = await getAdminDb().collection("users").where("role", "==", "admin").where("isActive", "==", true).get();

  for (const doc of snapshot.docs) {
    const profile = doc.data() as UserProfile;
    if (await hasValidAdminInAuth(profile.uid)) {
      return profile.uid;
    }
  }

  return null;
}

async function repairBootstrapTo(uid: string) {
  await getAdminDb().collection("system").doc(BOOTSTRAP_DOC_ID).set(
    {
      initialized: true,
      initializedByUid: uid,
      initializedAt: new Date().toISOString(),
      configurationValid: true,
      configurationStatus: "ready",
      bootstrapVersion: 1,
      bootstrapHealth: "valid"
    },
    { merge: true }
  );
}

export async function getSetupState(): Promise<SetupState> {
  const diagnostics = getFirebaseAdminDiagnostics();
  if (diagnostics.status !== "ready") {
    return {
      initialized: false,
      configurationValid: false,
      configurationStatus: diagnostics.status,
      bootstrapHealth: "missing"
    };
  }

  const bootstrapSnapshot = await getBootstrapDoc();
  if (!bootstrapSnapshot.exists) {
    const fallbackAdminUid = await findAnyValidAdminUid();

    if (fallbackAdminUid) {
      await repairBootstrapTo(fallbackAdminUid);
      return {
        initialized: true,
        initializedByUid: fallbackAdminUid,
        initializedAt: new Date().toISOString(),
        configurationValid: true,
        configurationStatus: diagnostics.status,
        bootstrapVersion: 1,
        bootstrapHealth: "valid"
      };
    }

    return {
      initialized: false,
      configurationValid: true,
      configurationStatus: diagnostics.status,
      bootstrapHealth: "missing"
    };
  }

  const data = bootstrapSnapshot.data() as SetupState;
  if (!data.initialized || !data.initializedByUid) {
    const fallbackAdminUid = await findAnyValidAdminUid();
    if (fallbackAdminUid) {
      await repairBootstrapTo(fallbackAdminUid);
      return {
        ...data,
        initialized: true,
        initializedByUid: fallbackAdminUid,
        configurationValid: true,
        configurationStatus: diagnostics.status,
        bootstrapVersion: data.bootstrapVersion ?? 1,
        bootstrapHealth: "valid"
      };
    }

    return {
      ...data,
      initialized: false,
      configurationValid: true,
      configurationStatus: diagnostics.status,
      bootstrapHealth: "orphaned"
    };
  }

  const bootstrapAdminValid = await isValidAdminUser(data.initializedByUid);
  if (bootstrapAdminValid) {
    return {
      ...data,
      initialized: true,
      configurationValid: true,
      configurationStatus: diagnostics.status,
      bootstrapHealth: "valid"
    };
  }

  const fallbackAdminUid = await findAnyValidAdminUid();
  if (fallbackAdminUid) {
    await repairBootstrapTo(fallbackAdminUid);
    return {
      ...data,
      initialized: true,
      initializedByUid: fallbackAdminUid,
      configurationValid: true,
      configurationStatus: diagnostics.status,
      bootstrapHealth: "valid"
    };
  }

  return {
    ...data,
    initialized: false,
    configurationValid: true,
    configurationStatus: diagnostics.status,
    bootstrapHealth: "orphaned"
  };
}

export async function isSystemInitialized() {
  const state = await getSetupState();
  return state.initialized;
}

export async function resolveSystemEntryState(): Promise<SystemEntryResolution> {
  const diagnostics = getFirebaseAdminDiagnostics();
  if (diagnostics.status !== "ready") {
    return {
      state: "config_broken",
      diagnostics,
      setup: {
        initialized: false,
        configurationValid: false,
        configurationStatus: diagnostics.status,
        bootstrapHealth: "missing"
      },
      session: null
    };
  }

  const setup = await getSetupState();
  if (!setup.initialized) {
    return {
      state: "setup_required",
      diagnostics,
      setup,
      session: null
    };
  }

  const session = await getSessionUser();
  if (session?.role === "admin") {
    return { state: "admin_authenticated", diagnostics, setup, session };
  }

  if (session?.role === "worker") {
    return { state: "worker_authenticated", diagnostics, setup, session };
  }

  return {
    state: "ready_no_session",
    diagnostics,
    setup,
    session: null
  };
}

export function invalidateSetupStateCache() {
  return;
}
