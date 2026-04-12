import sql from "./src/app/api/utils/sql.js";

async function patchBotSchema() {
  console.log("Starting DB Schema Patch for Premium Bot Integration...");

  try {
    // 1. Update user_settings table
    console.log("Adding bot fields to user_settings...");
    await sql`
      ALTER TABLE user_settings
      ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS is_bot_admin BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;
    `;
    console.log("user_settings patched successfully.");

    // 2. Create redeem_codes table
    console.log("Creating redeem_codes table...");
    await sql`
      CREATE TABLE IF NOT EXISTS redeem_codes (
        code TEXT PRIMARY KEY,
        duration_days INTEGER NOT NULL,
        is_used BOOLEAN DEFAULT false,
        created_by UUID,
        redeemed_by UUID,
        redeemed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("redeem_codes table created successfully.");

    console.log("Database patch completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Fatal error during DB patch:", error);
    process.exit(1);
  }
}

patchBotSchema();
