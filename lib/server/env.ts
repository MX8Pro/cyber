function readEnv(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

export function requireEnv(name: string) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string) {
  return readEnv(name);
}

export const firebaseAdminEnvKeys = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY"
] as const;

export type FirebaseAdminEnvKey = (typeof firebaseAdminEnvKeys)[number];

export interface FirebaseAdminEnvCheck {
  key: FirebaseAdminEnvKey;
  present: boolean;
}

export interface FirebaseAdminServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function stripWrappingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function getFirebaseAdminEnvChecks(): FirebaseAdminEnvCheck[] {
  return firebaseAdminEnvKeys.map((key) => ({
    key,
    present: Boolean(optionalEnv(key))
  }));
}

export function getServiceAccount() {
  const issues: string[] = [];
  const serviceAccountJson = optionalEnv("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON");

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson) as Partial<FirebaseAdminServiceAccount>;
      const projectId = parsed.projectId?.trim();
      const clientEmail = parsed.clientEmail?.trim();
      const privateKey = parsed.privateKey?.replace(/\\n/g, "\n");

      if (!projectId || !clientEmail || !privateKey) {
        issues.push("json_incomplete");
        return { serviceAccount: null, issues, source: "json" as const };
      }

      if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
        issues.push("private_key_format");
        return { serviceAccount: null, issues, source: "json" as const };
      }

      return {
        serviceAccount: { projectId, clientEmail, privateKey },
        issues,
        source: "json" as const
      };
    } catch {
      issues.push("json_parse_failed");
      return { serviceAccount: null, issues, source: "json" as const };
    }
  }

  const projectId = optionalEnv("FIREBASE_ADMIN_PROJECT_ID");
  const clientEmail = optionalEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const rawPrivateKey = optionalEnv("FIREBASE_ADMIN_PRIVATE_KEY");
  const privateKey = rawPrivateKey ? stripWrappingQuotes(rawPrivateKey).replace(/\\n/g, "\n") : null;

  if (!projectId) {
    issues.push("missing_project_id");
  }

  if (!clientEmail) {
    issues.push("missing_client_email");
  }

  if (!privateKey) {
    issues.push("missing_private_key");
  } else if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
    issues.push("private_key_format");
  }

  if (issues.length > 0 || !projectId || !clientEmail || !privateKey) {
    return { serviceAccount: null, issues, source: "env" as const };
  }

  return {
    serviceAccount: { projectId, clientEmail, privateKey },
    issues,
    source: "env" as const
  };
}
