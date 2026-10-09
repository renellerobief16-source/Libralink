const fs = require('fs');
const JSZip = require('jszip');

async function mapMedia() {
  const data = fs.readFileSync('LibraLink-mementomori (1).docx');
  const zip = await JSZip.loadAsync(data);
  const relsXml = await zip.file('word/_rels/document.xml.rels').async('string');
  const docXml = await zip.file('word/document.xml').async('string');
  
  // parse rels
  const rels = {};
  const relRegex = /Id="(rId\d+)"[^>]*Target="(media\/[^"]+)"/g;
  let rm;
  while ((rm = relRegex.exec(relsXml)) !== null) {
    rels[rm[1]] = rm[2];
  }
  
  // parse paragraphs with blip r:embed
  const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
  let pm;
  let lastText = '';
  
  while ((pm = pRegex.exec(docXml)) !== null) {
    const pContent = pm[1];
    let tRegex = /<w:t\b[^>]*>(.*?)<\/w:t>/g;
    let tMatch;
    let text = '';
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      text += tMatch[1];
    }
    if (text.trim()) lastText = text.trim();
    
    let blipRegex = /r:embed="(rId\d+)"/g;
    let bm;
    while ((bm = blipRegex.exec(pContent)) !== null) {
      const rId = bm[1];
      console.log('Image:', rels[rId] || rId, '| Caption/Context:', lastText.substring(0, 100));
    }
  }
}

mapMedia().catch(console.error);
