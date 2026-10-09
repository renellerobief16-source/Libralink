const fs = require('fs');
const html = fs.readFileSync('docs/complete_manuscript_diagrams_suite.html', 'utf8');
const cards = html.match(/id="card-[^"]+"/g);
console.log('Cards found:', cards);
console.log('Total length:', html.length);
