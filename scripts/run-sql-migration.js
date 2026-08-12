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
  console.log("🛠️  OKIKE Supabase Database Migration Tool");
  console.log("-----------------------------------------");
  console.log(`📌 Project ID: ${projectId}`);
  console.log(`📌 Host: db.${projectId}.supabase.co`);
  console.log("");
  
  const password = await askQuestion("🔑 Enter your Supabase Database Password (set when you created the project): ");
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
    console.log("⚡ Altering 'project_inquiries' table to add 'file_url' column...");
    await sql`
      ALTER TABLE public.project_inquiries 
      ADD COLUMN IF NOT EXISTS file_url text;
    `;
    console.log("✓ Column 'file_url' added successfully (or already exists).");

    console.log("⚡ Configuring Supabase Storage bucket and access policies for uploads...");
    // Create bucket 'media' if it doesn't exist
    await sql`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('media', 'media', true)
      ON CONFLICT (id) DO UPDATE SET public = true;
    `;

    // Recreate policies cleanly
    await sql`DROP POLICY IF EXISTS "Allow public SELECT on media bucket" ON storage.objects;`;
    await sql`DROP POLICY IF EXISTS "Allow public INSERT on media bucket" ON storage.objects;`;
    await sql`DROP POLICY IF EXISTS "Allow public UPDATE on media bucket" ON storage.objects;`;

    await sql`
      CREATE POLICY "Allow public SELECT on media bucket" 
      ON storage.objects FOR SELECT TO public USING (bucket_id = 'media');
    `;
    await sql`
      CREATE POLICY "Allow public INSERT on media bucket" 
      ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'media');
    `;
    await sql`
      CREATE POLICY "Allow public UPDATE on media bucket" 
      ON storage.objects FOR UPDATE TO public USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');
    `;
    console.log("✓ Storage bucket 'media' and policies configured successfully!");

    console.log("⚡ Reloading PostgREST API schema cache...");
    await sql`
      NOTIFY pgrst, 'reload schema';
    `;
    console.log("✓ PostgREST schema cache reloaded successfully!");
    
    console.log("\n🎉 Database migration completed successfully!");
  } catch (err) {
    console.error("\n❌ Database migration failed:");
    console.error(err.message);
    console.log("\n💡 Check your database password and ensure your local IP isn't blocked by Supabase DB firewalls.");
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main().catch(err => {
  console.error("❌ Uncaught migration error:", err);
  process.exit(1);
});
