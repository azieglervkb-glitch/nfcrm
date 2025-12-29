import crypto from "crypto";

function getEncryptionKey(): Buffer {
  const raw =
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!raw) {
    throw new Error(
      "Missing encryption key. Set TWO_FACTOR_ENCRYPTION_KEY (preferred) or AUTH_SECRET/NEXTAUTH_SECRET."
    );
  }

  // Derive a stable 32-byte key from whatever is provided.
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function encryptTotpSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptTotpSecret(payload: string): string {
  const key = getEncryptionKey();
  const [ivB64, ctB64, tagB64] = payload.split(":");

  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error("Invalid encrypted TOTP secret format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
