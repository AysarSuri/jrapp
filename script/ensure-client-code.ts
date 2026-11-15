import "../server/load-env";
import pg from "pg";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS code text;
    `);
    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS old_debt_currency text NOT NULL DEFAULT 'IQD';
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS clients_code_unique
      ON clients (code)
      WHERE code IS NOT NULL;
    `);
    // Backfill supplier codes from id when missing
    await pool.query(`
      UPDATE clients
      SET code = id::text
      WHERE type = 'supplier' AND (code IS NULL OR btrim(code) = '');
    `);
    // Infer opening-balance currency from existing amounts when still default IQD
    await pool.query(`
      UPDATE clients
      SET old_debt_currency = 'USD'
      WHERE COALESCE(old_debt_usd, 0) <> 0
        AND COALESCE(old_debt_iqd, 0) = 0
        AND (old_debt_currency IS NULL OR old_debt_currency = 'IQD');
    `);
    const r = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'clients' AND column_name IN ('code', 'old_debt_currency')
      ORDER BY column_name
    `);
    console.log("COLUMNS", r.rows.map((x: any) => x.column_name).join(","));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("MIGRATE_FAILED:", err.message);
  process.exitCode = 1;
});
