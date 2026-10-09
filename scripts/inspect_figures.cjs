const fs = require('fs');
const JSZip = require('jszip');

async function inspect() {
  const data = fs.readFileSync('LibraLink-mementomori (1).docx');
  const zip = await JSZip.loadAsync(data);
  const docXml = await zip.file('word/document.xml').async('string');
  const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
  let match, idx = 0;
  while ((match = pRegex.exec(docXml)) !== null) {
    const raw = match[0];
    const textMatch = raw.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g);
    const text = textMatch ? textMatch.map(m => m.replace(/<[^>]+>/g, '')).join('') : '';
    const hasDrawing = raw.includes('<w:drawing>') || raw.includes('<w:pict>');
    const blipMatch = raw.match(/r:embed="(rId\d+)"/);
    const blip = blipMatch ? blipMatch[1] : '';
    if (idx >= 1145 && idx <= 1160) {
      console.log(`P#${idx} [draw=${hasDrawing}${blip ? ' ' + blip : ''}]: ${text.substring(0, 90)}`);
    }
    idx++;
  }
}

inspect().catch(console.error);
