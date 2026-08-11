import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

try {
  for (const file of ['sql/001_schema.sql', 'sql/002_iot_tables.sql']) {
    const script = readFileSync(file, 'utf8');
    console.log(`Applying ${file} ...`);
    await sql.unsafe(script);
    console.log(`  done`);
  }

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `;
  console.log('\nTables now present:');
  console.log(tables.map(t => '  ' + t.table_name).join('\n'));
} catch (e) {
  console.error('MIGRATION FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
