import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'node:crypto';

const email = 'admin@raai.ai';
const password = randomBytes(12).toString('base64url');
const uid = uuidv4();

const sql = postgres(process.env.DATABASE_URL);

try {
  const hash = await bcrypt.hash(password, 10);
  const existing = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    console.log('Admin already exists — skipping.');
    process.exit(0);
  }
  await sql`
    INSERT INTO users (id, uid, first_name, last_name, display_name, email, role, password_hash)
    VALUES (${uid}, ${uid}, 'Admin', 'RAAI', 'Admin RAAI', ${email}, 'admin', ${hash})
  `;
  console.log('Admin created:');
  console.log('  email:    ' + email);
  console.log('  password: ' + password);
  console.log('SAVE THIS PASSWORD — it is only shown once.');
} finally {
  await sql.end();
}
