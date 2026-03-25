import Database from "better-sqlite3";

const db = new Database("./data/local.db");

try {
  const existing = db.prepare("SELECT id FROM user_profile LIMIT 1").get();

  if (existing) {
    db.prepare(`
      UPDATE user_profile
      SET
        name = ?,
        email = ?,
        phone = ?,
        role = ?,
        company = ?,
        password = ?,
        avatar_url = ?
      WHERE id = ?
    `).run(
      "Siddharth Jakhar",
      "Siddharthjakhar71@gmail.com",
      "",
      "Admin",
      "JAKHIRA ERP",
      "123456",
      "",
      existing.id
    );

    console.log("✅ user_profile updated");
  } else {
    db.prepare(`
      INSERT INTO user_profile
      (name, email, phone, role, company, password, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "Siddharth Jakhar",
      "Siddharthjakhar71@gmail.com",
      "",
      "Admin",
      "JAKHIRA ERP",
      "123456",
      ""
    );

    console.log("✅ user_profile created");
  }

  const profile = db.prepare("SELECT * FROM user_profile").all();
  console.table(profile);
} catch (err) {
  console.error("Error:", err.message);
}