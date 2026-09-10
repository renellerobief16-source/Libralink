const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Renel\\.gemini\\antigravity-ide\\brain\\0ee19b1e-b2af-49ec-a541-1877e18c9131';
const destDir = path.resolve(__dirname, '../../public/topics');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const mapping = {
  science_health: 'nursing_topic_card',
  tech_coding: 'tech_coding_card',
  business_finance: 'business_topic_card',
  literature_fiction: 'literature_topic_card',
  law_criminology: 'law_criminology_card',
  engineering_math: 'engineering_topic_card',
  arts_design: 'arts_design_card',
  history_society: 'history_topic_card',
  psychology_selfhelp: 'psychology_topic_card',
  education_pedagogy: 'education_topic_card',
  hospitality_tourism: 'hospitality_card',
};

const allFiles = fs.readdirSync(srcDir);

for (const [key, prefix] of Object.entries(mapping)) {
  const match = allFiles.find(f => f.startsWith(prefix) && f.endsWith('.jpg'));
  if (match) {
    const srcPath = path.join(srcDir, match);
    const destPath = path.join(destDir, `${key}.jpg`);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${match} -> public/topics/${key}.jpg (${(fs.statSync(destPath).size / 1024).toFixed(1)} KB)`);
  } else {
    console.warn(`No match found for ${prefix}`);
  }
}

console.log('All topic images copied successfully!');
