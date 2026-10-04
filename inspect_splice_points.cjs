const fs = require('fs');
const docXml = fs.readFileSync('scratch_extracted/word/document.xml', 'utf8');

// Find start of Chapter IV
// Looking for paragraph that contains CHAPTER IV
const ch4Pos = docXml.indexOf('<w:t>CHAPTER IV</w:t>');
console.log('ch4Pos:', ch4Pos);

// Find the <w:p preceding this
const pStartCh4 = docXml.lastIndexOf('<w:p ', ch4Pos);
console.log('pStartCh4:', pStartCh4);
console.log('Snippet before CH4:\n', docXml.substring(pStartCh4 - 100, pStartCh4 + 100));

// Find start of Chapter 5
const ch5Pos = docXml.indexOf('<w:t>Chapter 5</w:t>');
console.log('ch5Pos:', ch5Pos);
const pStartCh5 = docXml.lastIndexOf('<w:p ', ch5Pos);
console.log('pStartCh5:', pStartCh5);
console.log('Snippet before CH5:\n', docXml.substring(pStartCh5 - 100, pStartCh5 + 100));
