const fs = require('fs');
const { execSync } = require('child_process');

if (!fs.existsSync('scratch_extracted')) {
  fs.mkdirSync('scratch_extracted');
  execSync('powershell -Command "Expand-Archive -Path c:/xampp/htdocs/libralinkk/Libralink-Final1-copy.docx -DestinationPath scratch_extracted -Force"');
}

const docXml = fs.readFileSync('scratch_extracted/word/document.xml', 'utf8');

// Match all paragraphs
const pMatches = docXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
console.log('Total paragraphs:', pMatches.length);

const headings = [];
pMatches.forEach((p, idx) => {
  const tMatches = p.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g);
  if (!tMatches) return;
  const text = tMatches.map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
  if (text.length > 0 && text.length < 150) {
    if (
      /^(Chapter|CHAPTER|TABLE|LIST|Figure|Table|Title|Approval|Acknowledgement|Abstract|Bibliography|Appendix)/i.test(text) ||
      /(BACKGROUND|STATEMENT|SIGNIFICANCE|SCOPE|CONCEPTUAL|THEORETICAL|DEFINITION|REVIEW|METHODOLOGY|RESEARCH DESIGN|RESEARCH LOCALE|RESPONDENTS|SAMPLING|INSTRUMENT|GATHERING|STATISTICAL|SOFTWARE DEVELOPMENT|SYSTEM DESIGN|RESULTS|EVALUATION|SUMMARY|CONCLUSION|RECOMMENDATION)/i.test(text)
    ) {
      headings.push({ idx, text });
    }
  }
});

console.log('Found headings count:', headings.length);
fs.writeFileSync('extracted_headings.json', JSON.stringify(headings, null, 2));
console.log('Sample headings:');
headings.forEach(h => console.log(`[${h.idx}] ${h.text}`));
