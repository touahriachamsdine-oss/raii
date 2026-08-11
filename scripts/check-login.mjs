import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.DATABASE_URL);
try {
  const users = await sql`SELECT email, role, password_hash FROM users WHERE email = 'owner@raai.ai'`;
  console.log('user rows:', users.length);
  if (users.length) {
    const ok = await bcrypt.compare('Test1234', users[0].password_hash);
    console.log('bcrypt match:', ok, '| role:', users[0].role);
  }
} catch (e) {
  console.error('ERR', e.message);
} finally {
  await sql.end();
}