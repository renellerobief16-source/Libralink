const fs = require('fs');
const docXml = fs.readFileSync('scratch_extracted/word/document.xml', 'utf8');

const tocPos = docXml.indexOf('<w:t>TABLE OF CONTENTS</w:t>');
const ch1Pos = docXml.indexOf('<w:t xml:space="preserve">Chapter I </w:t>');

console.log('tocPos:', tocPos, 'ch1Pos:', ch1Pos);
console.log('TOC region:\n', docXml.substring(tocPos - 200, ch1Pos + 100));
