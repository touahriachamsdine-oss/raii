import postgres from 'postgres';

const globalForDb = global as unknown as { conn: postgres.Sql | undefined };

const conn = globalForDb.conn ?? postgres(process.env.DATABASE_URL!);

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export default conn;
