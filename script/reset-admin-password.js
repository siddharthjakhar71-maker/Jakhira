#!/usr/bin/env node
import Database from "better-sqlite3";
import { randomBytes, scryptSync } from "node:crypto";
import { join } from "node:path";

const HASH_PREFIX = "scrypt";
const SCRYPT_KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${HASH_PREFIX}:${salt}:${derivedKey}`;
}

function resolveDbPath() {
  const appDataDir = process.env.APP_DATA_DIR;
  const dataRoot = appDataDir && appDataDir.trim() ? appDataDir : process.cwd();
  return join(dataRoot, "data", "local.db");
}

function usage() {
  console.log("Usage: node script/reset-admin-password.js <email> <newPassword>");
  console.log("Example: node script/reset-admin-password.js admin@purchase.local Admin@12345");
}

const [, , emailArg, newPassword] = process.argv;
if (!emailArg || !newPassword) {
  usage();
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
if (newPassword.length < 6) {
  console.error("Error: password must be at least 6 characters.");
  process.exit(1);
}

const dbPath = resolveDbPath();
const db = new Database(dbPath);

try {
  const target = db
    .prepare("SELECT id, name, email, role, is_active FROM users WHERE lower(email) = lower(?) LIMIT 1")
    .get(email);

  if (!target) {
    console.error(`Error: user not found in users table for email '${email}'.`);
    process.exit(1);
  }

  const hashedPassword = hashPassword(newPassword);
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    return db
      .prepare("UPDATE users SET password = ?, updated_at = ? WHERE id = ?")
      .run(hashedPassword, now, target.id);
  });

  const result = tx();
  if (result.changes !== 1) {
    console.error("Error: expected to update exactly 1 user.");
    process.exit(1);
  }

  console.log("Password reset successful.");
  console.log(`User ID: ${target.id}`);
  console.log(`Name: ${target.name}`);
  console.log(`Email: ${target.email}`);
  console.log(`Role: ${target.role}`);
  console.log(`Active: ${target.is_active ? "yes" : "no"}`);
  console.log(`DB path: ${dbPath}`);
} finally {
  db.close();
}
