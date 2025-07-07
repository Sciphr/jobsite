// migrate.js - Save this in your project root
import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    await client.connect();
    ("✓ Connected to database");

    // Add new columns
    ("Adding new columns...");

    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';`
    );
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "privilegeLevel" INTEGER DEFAULT 0;`
    );
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;`
    );

    ("✓ Columns added");

    // Check if admin_users exists
    const adminTableCheck = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_users');
    `);

    if (adminTableCheck.rows[0].exists) {
      ("Migrating admin users...");

      const adminUsers = await client.query("SELECT * FROM admin_users;");

      for (const admin of adminUsers.rows) {
        const privilegeLevel =
          admin.role === "super_admin"
            ? 3
            : admin.role === "admin"
            ? 2
            : admin.role === "hr"
            ? 1
            : 0;

        await client.query(
          `
          INSERT INTO users (id, email, password, "firstName", "lastName", role, "privilegeLevel", "isActive", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, true, COALESCE($8, NOW()), COALESCE($9, NOW()))
          ON CONFLICT (email) DO UPDATE SET
            role = EXCLUDED.role,
            "privilegeLevel" = EXCLUDED."privilegeLevel";
        `,
          [
            admin.id,
            admin.email,
            admin.password,
            admin.firstName,
            admin.lastName,
            admin.role,
            privilegeLevel,
            admin.createdAt,
            admin.updatedAt,
          ]
        );

        `✓ Migrated: ${admin.email}`;
      }
    }

    // Show results
    const adminCount = await client.query(
      `SELECT COUNT(*) FROM users WHERE "privilegeLevel" > 0;`
    );
    `\n✅ Migration complete! Admin users: ${adminCount.rows[0].count}`;
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.end();
  }
}

migrate();
