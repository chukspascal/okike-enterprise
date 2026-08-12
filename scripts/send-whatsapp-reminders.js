import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth } = pkg;

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

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

function formatPhone(phone) {
  let clean = phone.replace(/[^\d]/g, ""); // Keep only digits
  if (clean.startsWith("0")) {
    clean = "234" + clean.slice(1);
  }
  return clean;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("⚡ Fetching registrations from Supabase database...");
  
  const { data: registrations, error } = await supabase
    .from('bootcamp_registrations')
    .select('id, name, phone, email, course, payment_status')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ Failed to fetch registrations:", error.message);
    process.exit(1);
  }

  // Filter out registrations without a valid phone number
  const validRegistrations = registrations.filter(r => r.phone && formatPhone(r.phone).length >= 10);

  console.log(`✓ Retrieved ${registrations.length} registrations. (${validRegistrations.length} have valid phone numbers)`);
  
  if (validRegistrations.length === 0) {
    console.log("📭 No registered students with valid phone numbers found.");
    process.exit(0);
  }

  // 2. Ask user details
  const groupLink = await askQuestion("🔗 Paste WhatsApp Group Link (default: https://chat.whatsapp.com/GLemXx2uWn5F6Nm40ihiD7): ") || "https://chat.whatsapp.com/GLemXx2uWn5F6Nm40ihiD7";
  
  console.log("\nDefault template message:");
  console.log(`"Hello {{name}}, this is the OKIKE team. We noticed you registered for the bootcamp, but you are not yet in the WhatsApp community. Please join using this link to receive all announcements and class updates:\n\n{{link}}"`);
  
  const customTemplate = await askQuestion("\n📝 Enter message template (or press Enter to use default above): ");
  const template = customTemplate.trim() || "Hello {{name}}, this is the OKIKE team. We noticed you registered for the bootcamp, but you are not yet in the WhatsApp community. Please join using this link to receive all announcements and class updates:\n\n{{link}}";

  console.log("\nFilter options:");
  console.log("1. All tracks");
  console.log("2. Paid tickets only");
  console.log("3. Free tickets only (CS/IT department)");
  const filterChoice = await askQuestion("Select filter choice (1-3): ");

  let targets = [...validRegistrations];
  if (filterChoice === "2") {
    targets = targets.filter(r => r.payment_status === "paid");
  } else if (filterChoice === "3") {
    targets = targets.filter(r => r.payment_status === "free");
  }

  console.log(`\n🎯 Targets identified: ${targets.length} students`);
  
  if (targets.length === 0) {
    console.log("❌ No students match the selected filter. Exiting.");
    process.exit(0);
  }

  const confirmProceed = await askQuestion(`⚠️ Ready to send messages to ${targets.length} students. Proceed to link WhatsApp? (y/n): `);
  if (confirmProceed.toLowerCase() !== 'y') {
    console.log("Cancelled. Exiting.");
    process.exit(0);
  }

  // Choose running mode (headless vs headful)
  console.log("\nChoose WhatsApp browser running mode:");
  console.log("1. Headless (runs in the background - default)");
  console.log("2. Headful (opens a visible Chrome window - recommended if headless fails or crashes)");
  const headlessChoice = await askQuestion("Select choice (1-2): ");
  const headless = headlessChoice !== "2";

  // 3. Initialize WhatsApp Web Client
  console.log("\n📦 Starting WhatsApp Web Client... (Scanning QR code required)");
  
  // Find local Chromium browser binary path on Windows (Chrome, Edge, Brave)
  function getBrowserPath() {
    const paths = [
      // Chrome
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.USERPROFILE || '', 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
      
      // Edge
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
      
      // Brave
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
    return undefined;
  }

  let browserPath = getBrowserPath();
  if (browserPath) {
    console.log(`📌 Using Chromium browser installed at: ${browserPath}`);
  } else {
    console.log("\n⚠️ No default Chromium browser (Chrome, Edge, Brave) detected in standard paths.");
    const customPath = await askQuestion("📝 Please enter the absolute path to your browser executable (chrome.exe / msedge.exe / brave.exe): ");
    const trimmedPath = customPath.trim().replace(/^["']|["']$/g, ""); // strip quotes
    if (trimmedPath && fs.existsSync(trimmedPath)) {
      browserPath = trimmedPath;
      console.log(`📌 Using custom browser path: ${browserPath}`);
    } else {
      console.error("❌ Error: A Chromium-based browser is required to run the WhatsApp automation client. Please install Google Chrome or Microsoft Edge.");
      process.exit(1);
    }
  }

  // Pre-cleanup check for Crashpad lock files
  const activeLockPath = path.resolve(process.cwd(), '.wwebjs_auth/session/CrashpadMetrics-active.pma');
  if (fs.existsSync(activeLockPath)) {
    try {
      fs.unlinkSync(activeLockPath);
    } catch (e) {
      console.log("\n⚠️ NOTICE: Session lock file (.wwebjs_auth/.../CrashpadMetrics-active.pma) is currently locked by a background process.");
      console.log("👉 If the script crashes with EBUSY, please open your Task Manager and close any background 'chrome.exe' or 'msedge.exe' processes.");
    }
  }

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: headless,
      executablePath: browserPath,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-crash-reporter',
        '--disable-logging',
        '--use-gl=desktop',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  // Gracefully handle exit to release file locks
  process.on('SIGINT', async () => {
    console.log("\n🔌 Gracefully shutting down client...");
    try {
      await client.destroy();
    } catch (e) {}
    process.exit(0);
  });

  client.on('qr', (qr) => {
    console.log("\n📲 Scan the QR Code below with your WhatsApp mobile app to connect:\n");
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', async () => {
    console.log("\n🚀 WhatsApp Client Connected & Ready!");
    console.log("🛑 WARNING: Do not close the terminal while sending is in progress.\n");

    let count = 0;
    for (let i = 0; i < targets.length; i++) {
      const student = targets[i];
      const formattedPhone = formatPhone(student.phone) + "@c.us";
      const message = template
        .replace(/{{name}}/g, student.name)
        .replace(/{{link}}/g, groupLink);

      try {
        console.log(`[${i + 1}/${targets.length}] Sending reminder to ${student.name} (${student.phone})...`);
        await client.sendMessage(formattedPhone, message);
        count++;
        console.log(`  ✓ Sent successfully.`);
      } catch (err) {
        console.error(`  ❌ Failed to send to ${student.name}:`, err.message);
      }

      // Add a randomized delay of 8-15 seconds to prevent rate limits/spam triggers
      if (i < targets.length - 1) {
        const sleepSeconds = Math.floor(Math.random() * (15 - 8 + 1)) + 8;
        console.log(`  ⏱ Waiting ${sleepSeconds} seconds before sending the next...`);
        await delay(sleepSeconds * 1000);
      }
    }

    console.log(`\n🎉 Completed! Successfully sent ${count} / ${targets.length} reminders.`);
    console.log("🔌 Disconnecting client...");
    try {
      await client.destroy();
    } catch (e) {}
    console.log("👋 Done!");
    process.exit(0);
  });

  client.on('auth_failure', (msg) => {
    console.error("❌ Authentication failure:", msg);
    process.exit(1);
  });

  try {
    client.initialize();
  } catch (err) {
    console.error("❌ Client initialization failed:", err.message);
    if (err.message.includes("EBUSY")) {
      console.log("\n💡 TIP: Please open your Windows Task Manager and end any lingering background 'chrome.exe' or 'msedge.exe' processes, then run again.");
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error("❌ Error in main script execution:", err);
  process.exit(1);
});
