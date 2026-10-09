const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\Renel\\.gemini\\antigravity-ide\\brain\\9fb96261-361d-4b22-b935-d815a0fcaa7d\\libralink_swarms_slide_1791297050428.jpg';
const dest1 = path.join(__dirname, '..', 'public', 'libralink_capstone_poster.jpg');
const dest2 = path.join(__dirname, '..', 'public', 'libralink_capstone_centerpiece.png');
const dest3 = path.join(__dirname, '..', 'public', 'libralink_final_capstone_poster.jpg');

try {
  fs.copyFileSync(src, dest1);
  fs.copyFileSync(src, dest2);
  fs.copyFileSync(src, dest3);
  console.log('Successfully restored exact chosen image to public folder!');
} catch (err) {
  console.error('Error copying file:', err);
}
