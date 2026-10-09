const fs = require('fs');
const { getCompleteUseCaseSvg } = require('./generate_complete_usecase_svg.cjs');

let html = fs.readFileSync('docs/complete_use_case_diagram.html', 'utf8');
html = html.replace(/<svg id="svg-complete-usecase"[\s\S]*?<\/svg>/, getCompleteUseCaseSvg());
fs.writeFileSync('docs/complete_use_case_diagram.html', html, 'utf8');
console.log('Successfully updated docs/complete_use_case_diagram.html!');
