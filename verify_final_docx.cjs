const fs = require('fs');
const { execSync } = require('child_process');

console.log('Verifying Libralink-Final-Updated.docx...');

if (fs.existsSync('scratch_verify')) {
  fs.rmSync('scratch_verify', { recursive: true, force: true });
}

// Copy to zip and extract
fs.copyFileSync('Libralink-Final-Updated.docx', 'verify_temp.zip');
execSync('powershell -Command "Expand-Archive -Path verify_temp.zip -DestinationPath scratch_verify -Force"');
fs.unlinkSync('verify_temp.zip');

const docXml = fs.readFileSync('scratch_verify/word/document.xml', 'utf8');
console.log('document.xml successfully read, size:', docXml.length);

// Check key markers
const checks = [
  'TABLE OF CONTENTS',
  'LIST OF TABLES',
  'LIST OF FIGURES',
  'Chapter I',
  'Chapter II',
  'Chapter III',
  'CHAPTER 4 – PRESENTATION, ANALYSIS, AND INTERPRETATION OF DATA',
  'Demographic Breakdown of Respondents',
  'ISO/IEC 25010',
  'Chapter 5',
  'Bibliography',
  'Appendix'
];

checks.forEach(c => {
  const found = docXml.includes(c);
  console.log(`[CHECK] "${c}": ${found ? 'PASS' : 'FAIL'}`);
});

// Check relationships
const relsXml = fs.readFileSync('scratch_verify/word/_rels/document.xml.rels', 'utf8');
console.log('[CHECK] rId107 present in rels:', relsXml.includes('rId107'));
console.log('[CHECK] rId114 present in rels:', relsXml.includes('rId114'));

// Check media files
const mediaFiles = fs.readdirSync('scratch_verify/word/media');
console.log('Media files count in final docx:', mediaFiles.length);

fs.rmSync('scratch_verify', { recursive: true, force: true });
console.log('Verification finished cleanly!');
