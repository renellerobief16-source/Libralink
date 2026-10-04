const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function grantPermissions() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PG.');

    const sql = `
      GRANT ALL ON TABLE public.libraries TO anon, authenticated, service_role;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
      ALTER TABLE public.libraries ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow all on libraries" ON public.libraries;
      CREATE POLICY "Allow all on libraries" ON public.libraries FOR ALL TO public USING (true) WITH CHECK (true);
    `;

    await client.query(sql);
    console.log('Granted permissions and configured RLS on libraries table.');
  } catch (err) {
    console.error('Error granting permissions:', err);
  } finally {
    await client.end();
  }
}

grantPermissions();
