const fs = require('fs');
const docXml = fs.readFileSync('scratch_ch4/word/document.xml', 'utf8');
const rIdMatches = docXml.match(/r:embed="([^"]+)"/g) || [];
console.log('r:embed in scratch_ch4:', rIdMatches);
