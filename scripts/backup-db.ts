import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.pdthccijqnhphjbtrtwo:Nincsapellata1%27@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function runBackup() {
  const client = new Client({
    connectionString: connectionString.includes('db.pdthccijqnhphjbtrtwo.supabase.co')
      ? "postgresql://postgres.pdthccijqnhphjbtrtwo:Nincsapellata1%27@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
      : connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to Supabase Postgres. Discovering tables...");

    // Get all public user tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames = tableRes.rows.map(r => r.table_name);
    console.log(`Found ${tableNames.length} tables in public schema.`);

    const backupData: Record<string, any[]> = {};
    const tableCounts: Record<string, number> = {};

    for (const tableName of tableNames) {
      try {
        const rowsRes = await client.query(`SELECT * FROM public."${tableName}";`);
        backupData[tableName] = rowsRes.rows;
        tableCounts[tableName] = rowsRes.rows.length;
        console.log(`  - ${tableName}: ${rowsRes.rows.length} rows`);
      } catch (err: any) {
        console.warn(`  ! Could not dump ${tableName}: ${err.message}`);
      }
    }

    const backupDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `backup_pre_multitenancy_${timestamp}.json`);
    const latestFilePath = path.join(backupDir, 'backup_pre_multitenancy_latest.json');

    const jsonStr = JSON.stringify({
      timestamp: new Date().toISOString(),
      tableCounts,
      data: backupData
    }, null, 2);

    fs.writeFileSync(backupFilePath, jsonStr, 'utf8');
    fs.writeFileSync(latestFilePath, jsonStr, 'utf8');

    console.log(`\nBackup successfully written to:\n  -> ${backupFilePath}\n  -> ${latestFilePath}`);
  } catch (err) {
    console.error("Backup failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runBackup();
