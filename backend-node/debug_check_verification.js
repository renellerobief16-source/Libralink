const supabase = require('./config/database');

(async () => {
  const { data, error } = await supabase
    .from('verification_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log(JSON.stringify({ data, error }, null, 2));
  process.exit(error ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
