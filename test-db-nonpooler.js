const postgres = require('postgres');
// Trying non-pooler URL
const sql = postgres('postgresql://neondb_owner:npg_DwNVOydgUz18@ep-fancy-wildflower-anlhtt8r.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function test() {
  try {
    console.log('Connecting to database (non-pooler)...');
    const result = await sql`SELECT 1 as connected`;
    console.log('Success:', result);
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  }
}

test();
