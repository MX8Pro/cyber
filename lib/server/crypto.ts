import crypto from "node:crypto";
import { requireEnv } from "@/lib/server/env";

function getEncryptionKey() {
  const raw = requireEnv("APP_ENCRYPTION_KEY");
  const normalized = raw.trim();
  const key =
    normalized.length === 64
      ? Buffer.from(normalized, "hex")
      : normalized.length === 32
        ? Buffer.from(normalized, "utf8")
        : Buffer.from(normalized, "base64");

  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes as raw text, hex, or base64");
  }

  return key;
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    version: 1
  };
}

export function decryptSecret(input: { ciphertext: string; iv: string; tag: string }) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(input.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(input.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

export function maskSecret(value: string | null | undefined, visibleSuffix = 4) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length <= visibleSuffix) {
    return "*".repeat(trimmed.length);
  }

  return `${"*".repeat(Math.max(6, trimmed.length - visibleSuffix))}${trimmed.slice(-visibleSuffix)}`;
}
