import { requireEnv } from "@/lib/server/env";

interface SignInResult {
  idToken: string;
  refreshToken: string;
  localId: string;
}

export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const apiKey = requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error("AUTH_INVALID_CREDENTIALS");
  }

  return response.json() as Promise<SignInResult>;
}

export async function signInWithCustomToken(customToken: string): Promise<SignInResult> {
  const apiKey = requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error("AUTH_INVALID_CUSTOM_TOKEN");
  }

  return response.json() as Promise<SignInResult>;
}
