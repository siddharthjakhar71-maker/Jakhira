import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt";

function deriveKey(password: string, salt: string): Buffer {
  return scryptSync(password, salt, SCRYPT_KEY_LENGTH);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = deriveKey(password, salt).toString("hex");
  return `${HASH_PREFIX}:${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedPassword: string): boolean {
  const [prefix, salt, storedHash] = storedPassword.split(":");

  if (prefix !== HASH_PREFIX || !salt || !storedHash) {
    return password === storedPassword;
  }

  const derivedKey = deriveKey(password, salt);
  const storedKey = Buffer.from(storedHash, "hex");

  if (derivedKey.length !== storedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKey);
}

export function isPasswordHashed(password: string): boolean {
  return password.startsWith(`${HASH_PREFIX}:`);
}
