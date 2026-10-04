const fs = require('fs');
const docXml = fs.readFileSync('scratch_extracted/word/document.xml', 'utf8');

const pTOCStart = docXml.lastIndexOf('<w:p ', docXml.indexOf('<w:t>TABLE OF CONTENTS</w:t>'));
const pCh1Start = docXml.lastIndexOf('<w:p ', docXml.indexOf('Chapter I'));

console.log('pTOCStart:', pTOCStart, 'pCh1Start:', pCh1Start);
console.log('TOC to CH1 length:', pCh1Start - pTOCStart);
console.log('Snippet at pCh1Start - 200:\n', docXml.substring(pCh1Start - 200, pCh1Start));
