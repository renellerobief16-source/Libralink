const fs = require('fs');
const path = require('path');
const supabase = require('../config/database');

(async () => {
  try {
    console.log('Starting logo normalization...');

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'logos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const { data: schools, error } = await supabase
      .from('schools')
      .select('school_id, school_name, logo');

    if (error) {
      console.error('Error fetching schools:', error);
      process.exit(1);
    }

    for (const s of schools) {
      const { school_id, school_name, logo } = s;
      if (!logo) continue;

      // If logo is a data URL, decode and save
      if (typeof logo === 'string' && logo.startsWith('data:')) {
        try {
          const matches = logo.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
          if (!matches) {
            console.warn(`School ${school_id} (${school_name}): invalid data URL`);
            continue;
          }
          const mime = matches[1];
          const b64 = matches[2];
          const ext = mime.split('/')[1].split('+')[0] || 'png';
          const filename = `logo-school-${school_id}-${Date.now()}.${ext}`;
          const filePath = path.join(uploadsDir, filename);

          fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));

          const relativePath = `/uploads/logos/${filename}`;

          const { error: updErr } = await supabase
            .from('schools')
            .update({ logo: relativePath })
            .eq('school_id', school_id);

          if (updErr) {
            console.error(`Failed to update school ${school_id}:`, updErr);
          } else {
            console.log(`Converted data URL -> ${relativePath} for school ${school_id}`);
          }
        } catch (err) {
          console.error(`Error processing data URL for school ${school_id}:`, err);
        }

        continue;
      }

      // If logo is an absolute URL that contains '/uploads/', convert to relative
      if (typeof logo === 'string' && (logo.startsWith('http://') || logo.startsWith('https://'))) {
        try {
          const idx = logo.indexOf('/uploads/');
          if (idx !== -1) {
            const relative = logo.substring(idx);
            const { error: updErr } = await supabase
              .from('schools')
              .update({ logo: relative })
              .eq('school_id', school_id);

            if (updErr) {
              console.error(`Failed to update absolute URL -> relative for school ${school_id}:`, updErr);
            } else {
              console.log(`Converted absolute URL -> ${relative} for school ${school_id}`);
            }
          } else {
            // External URL (third-party) - leave unchanged but log
            console.log(`School ${school_id} has external logo URL, left unchanged: ${logo}`);
          }
        } catch (err) {
          console.error(`Error processing absolute URL for school ${school_id}:`, err);
        }
      }

      // If already relative (starts with '/uploads'), nothing to do
    }

    console.log('Logo normalization completed.');
    process.exit(0);
  } catch (err) {
    console.error('Normalization script failed:', err);
    process.exit(1);
  }
})();
