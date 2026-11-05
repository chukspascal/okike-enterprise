const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL || "https://hiqixhmmquugcifdtaep.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!key) {
  console.error("Please set SUPABASE_SERVICE_ROLE_KEY environment variable.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('bootcamp_registrations').select('*');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Registrations (" + data.length + "):");
    data.forEach(r => {
      console.log(`- ID: ${r.id}, Email: "${r.email}", Name: "${r.name}", Course: "${r.course}"`);
    });
  }
}
run();
