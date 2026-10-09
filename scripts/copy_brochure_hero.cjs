const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\Renel\\.gemini\\antigravity-ide\\brain\\9fb96261-361d-4b22-b935-d815a0fcaa7d\\brochure_cover_hero_1791306787954.jpg';
const dest = path.join(__dirname, '..', 'public', 'brochure_cover_hero.jpg');

try {
  fs.copyFileSync(src, dest);
  console.log('Successfully copied brochure cover hero to public!');
} catch (err) {
  console.error('Error copying file:', err);
}
