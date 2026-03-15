declare module "firebase-admin/app" {
  export function getApps(): unknown[];
  export function initializeApp(options?: unknown): unknown;
  export function cert(serviceAccount: unknown): unknown;
  export function applicationDefault(): unknown;
}

declare module "firebase-admin/auth" {
  export function getAuth(app?: unknown): {
    createUser(input: Record<string, unknown>): Promise<{ uid: string }>;
    setCustomUserClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
    createSessionCookie(idToken: string, options: { expiresIn: number }): Promise<string>;
    verifySessionCookie(cookie: string, checkRevoked?: boolean): Promise<Record<string, any>>;
    verifyIdToken(idToken: string): Promise<Record<string, any>>;
    updateUser(uid: string, input: Record<string, unknown>): Promise<void>;
    revokeRefreshTokens(uid: string): Promise<void>;
  };
}

declare module "firebase-admin/firestore" {
  export class Timestamp {
    toDate(): Date;
  }

  export const FieldValue: {
    increment(value: number): unknown;
  };

  export function getFirestore(app?: unknown): any;
}
