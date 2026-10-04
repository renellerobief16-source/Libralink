const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is missing in backend-node/.env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    const sqlPath = path.join(__dirname, '..', '..', 'migrations', 'add_multi_library_support.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration from:', sqlPath);
    await client.query(sql);

    console.log('Migration executed successfully!');

    // Verification queries
    const libRes = await client.query('SELECT library_id, school_id, name, library_type, status FROM libraries');
    console.log(`Total libraries created/found: ${libRes.rows.length}`);
    console.table(libRes.rows);

    const userCountRes = await client.query('SELECT COUNT(*) FROM users WHERE library_id IS NOT NULL');
    console.log(`Users with library_id: ${userCountRes.rows[0].count}`);

    const bookCountRes = await client.query('SELECT COUNT(*) FROM books WHERE library_id IS NOT NULL');
    console.log(`Books with library_id: ${bookCountRes.rows[0].count}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

runMigration();
