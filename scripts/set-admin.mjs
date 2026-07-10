import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';

const { users } = await import('../drizzle/schema.ts');

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Check current state
const existing = await db.select().from(users).where(eq(users.email, 'kazuyoshi.yamada@bonfire.co.jp'));
console.log('Current user record:', JSON.stringify(existing, null, 2));

if (existing.length === 0) {
  console.log('User not found in DB. They need to log in first to create a record.');
} else {
  // Update role to admin
  await db.update(users)
    .set({ role: 'admin' })
    .where(eq(users.email, 'kazuyoshi.yamada@bonfire.co.jp'));
  
  const updated = await db.select().from(users).where(eq(users.email, 'kazuyoshi.yamada@bonfire.co.jp'));
  console.log('Updated user record:', JSON.stringify(updated, null, 2));
}

await conn.end();
