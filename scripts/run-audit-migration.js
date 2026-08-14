import fs from 'fs';
import path from 'path';
import readline from 'readline';
import postgres from 'postgres';

// 1. Parse .env file manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  }
}

const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
if (!projectId) {
  console.error("❌ Error: VITE_SUPABASE_PROJECT_ID must be configured in .env");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("🛠️  OKIKE Supabase Audit Logging Database Migration Tool");
  console.log("-----------------------------------------");
  console.log(`📌 Project ID: ${projectId}`);
  console.log(`📌 Host: db.${projectId}.supabase.co`);
  console.log("");
  
  const password = await askQuestion("🔑 Enter your Supabase Database Password: ");
  if (!password) {
    console.error("❌ Error: Database password is required.");
    process.exit(1);
  }

  // Close readline
  rl.close();

  // URL Encode password in case it contains special characters
  const encodedPassword = encodeURIComponent(password);
  const connectionString = `postgres://postgres:${encodedPassword}@db.${projectId}.supabase.co:5432/postgres`;

  console.log("\n⚡ Connecting to Supabase PostgreSQL database...");
  const sql = postgres(connectionString);

  try {
    const sqlPath = path.resolve(process.cwd(), 'supabase', 'migrations', 'create_audit_logs.sql');
    console.log(`⚡ Loading SQL migration from: ${sqlPath}`);
    const migrationSql = fs.readFileSync(sqlPath, 'utf8');

    console.log("⚡ Executing database audit logs migration...");
    // Run the migration sql queries using unsafe to support multiple SQL statements
    await sql.unsafe(migrationSql);
    console.log("✓ Audit logs tables, policies, triggers, and cache reloaded successfully!");
    
    console.log("\n🎉 Database migration completed successfully!");
  } catch (err) {
    console.error("\n❌ Migration Failed!");
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
