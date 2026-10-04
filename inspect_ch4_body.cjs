const fs = require('fs');
const docXml = fs.readFileSync('scratch_ch4/word/document.xml', 'utf8');

const bodyStart = docXml.indexOf('<w:body>') + '<w:body>'.length;
const bodyEnd = docXml.lastIndexOf('</w:body>');

console.log('bodyStart:', bodyStart, 'bodyEnd:', bodyEnd);
console.log('First 200 chars of body:\n', docXml.substring(bodyStart, bodyStart + 200));
console.log('Last 300 chars of body:\n', docXml.substring(bodyEnd - 300, bodyEnd));
