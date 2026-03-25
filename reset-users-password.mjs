import Database from "better-sqlite3";
import crypto from "crypto";

const db = new Database("./data/local.db");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const email = "Siddharthjakhar71@gmail.com";
const newPassword = "123456";
const hashedPassword = hashPassword(newPassword);

try {
  const existing = db.prepare(
    "SELECT id, email, role, is_active FROM users WHERE lower(email) = lower(?)"
  ).get(email);

  if (!existing) {
    console.log("User not found in users table");
    const allUsers = db.prepare("SELECT id, email, role, is_active FROM users").all();
    console.table(allUsers);
    process.exit(0);
  }

  db.prepare(`
    UPDATE users
    SET password = ?, is_active = 1
    WHERE id = ?
  `).run(hashedPassword, existing.id);

  console.log("✅ users table password updated");
  console.table(
    db.prepare("SELECT id, email, role, is_active FROM users WHERE id = ?").all(existing.id)
  );
  console.log("Login with:");
  console.log("Email:", email);
  console.log("Password:", newPassword);
} catch (err) {
  console.error("Error:", err.message);
}