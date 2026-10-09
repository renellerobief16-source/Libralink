const fs = require('fs');
const path = require('path');

const gncSrc = 'C:\\Users\\Renel\\.gemini\\antigravity-ide\\brain\\9fb96261-361d-4b22-b935-d815a0fcaa7d\\.user_uploaded\\media_1791295920390.jpg';
const srcSrc = 'C:\\Users\\Renel\\.gemini\\antigravity-ide\\brain\\9fb96261-361d-4b22-b935-d815a0fcaa7d\\.user_uploaded\\media_1791295920411.jpg';

try {
  fs.copyFileSync(gncSrc, path.join(__dirname, '..', 'public', 'gnc_logo.jpg'));
  fs.copyFileSync(srcSrc, path.join(__dirname, '..', 'public', 'src_logo.jpg'));
  console.log('Successfully copied school logos to public folder!');
} catch (e) {
  console.error('Error copying logos:', e);
}
