const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== STARTING MANUSCRIPT UPDATE SCRIPT ===');

const basePath = 'c:/xampp/htdocs/libralinkk';
const origDocx = path.join(basePath, 'Libralink-Final1.docx');
const backupDocx = path.join(basePath, 'Libralink-Final1-Original-Backup.docx');
const updatedDocx = path.join(basePath, 'Libralink-Final-Updated.docx');

// 1. Create backup if not already present
if (!fs.existsSync(backupDocx)) {
  fs.copyFileSync(origDocx, backupDocx);
  console.log('Created backup:', backupDocx);
} else {
  console.log('Backup already exists:', backupDocx);
}

// 2. Ensure scratch_extracted exists and is populated
const docXmlPath = path.join(basePath, 'scratch_extracted/word/document.xml');
let docXml = fs.readFileSync(docXmlPath, 'utf8');
console.log('Loaded original document.xml, length:', docXml.length);

// 3. Copy media files and update rels
const mediaMap = [
  { oldFile: '358449f8cae872ebc64900bd8b1716b933d84b83.undefined', newName: 'ch4_usecase_fig.png', rId: 'rId107', oldRId: 'rId7' },
  { oldFile: '934f2cd941e61c0ab0d714c42edd46cc11e56305.undefined', newName: 'ch4_context_fig.png', rId: 'rId108', oldRId: 'rId8' },
  { oldFile: 'b47fe9b13881c71ae7e2ead91e6c5e7f8ad9176c.undefined', newName: 'ch4_landing_fig.png', rId: 'rId109', oldRId: 'rId9' },
  { oldFile: 'ff900189c74015ec6ddfa2cd870cf134408628a5.undefined', newName: 'ch4_student_fig.png', rId: 'rId110', oldRId: 'rId10' },
  { oldFile: 'fce93db3e62bc2e67afc314a28b6611e6e752097.undefined', newName: 'ch4_flow_fig.png', rId: 'rId111', oldRId: 'rId11' },
  { oldFile: 'a8b11838c1717c6a37311d18979d6901000f3664.undefined', newName: 'ch4_admin_fig.png', rId: 'rId112', oldRId: 'rId12' },
  { oldFile: 'dde7c6c441c92acd8b06fbbb8099106220e896d1.undefined', newName: 'ch4_erd_fig.png', rId: 'rId113', oldRId: 'rId13' },
  { oldFile: '3f98e996942ddb44191e90835fefb8c7abf5a681.undefined', newName: 'ch4_tables_fig.png', rId: 'rId114', oldRId: 'rId14' },
];

mediaMap.forEach(m => {
  const src = path.join(basePath, 'scratch_ch4/word/media', m.oldFile);
  const dst = path.join(basePath, 'scratch_extracted/word/media', m.newName);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`Copied image: ${m.oldFile} -> ${m.newName}`);
  } else {
    console.warn(`Source image missing: ${src}`);
  }
});

// Update scratch_extracted/word/_rels/document.xml.rels
const relsPath = path.join(basePath, 'scratch_extracted/word/_rels/document.xml.rels');
let relsXml = fs.readFileSync(relsPath, 'utf8');

mediaMap.forEach(m => {
  if (!relsXml.includes(`Id="${m.rId}"`)) {
    const relTag = `<Relationship Id="${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.newName}"/>`;
    relsXml = relsXml.replace('</Relationships>', `${relTag}</Relationships>`);
    console.log(`Added relationship ${m.rId} for ${m.newName}`);
  }
});
fs.writeFileSync(relsPath, relsXml, 'utf8');

// 4. Extract new Chapter 4 XML from scratch_ch4
const ch4DocXmlPath = path.join(basePath, 'scratch_ch4/word/document.xml');
const ch4DocXml = fs.readFileSync(ch4DocXmlPath, 'utf8');
const ch4BodyStart = ch4DocXml.indexOf('<w:body>') + '<w:body>'.length;
const ch4SectIdx = ch4DocXml.lastIndexOf('<w:sectPr');
let ch4Content = ch4DocXml.substring(ch4BodyStart, ch4SectIdx);

// Remap rId references in ch4Content
mediaMap.forEach(m => {
  const re = new RegExp(`r:embed="${m.oldRId}"`, 'g');
  ch4Content = ch4Content.replace(re, `r:embed="${m.rId}"`);
});
console.log('Processed new Chapter 4 XML, length:', ch4Content.length);

// 5. Generate TABLE OF CONTENTS, LIST OF TABLES, LIST OF FIGURES XML
function makeTOCItem(title, page, isBold = false, indent = 0) {
  const indXml = indent > 0 ? `<w:ind w:left="${indent}"/>` : '';
  const boldXml = isBold ? '<w:b/><w:bCs/>' : '';
  const szXml = '<w:sz w:val="22"/><w:szCs w:val="22"/>';
  const beforeSpacing = isBold ? (indent === 0 ? '160' : '100') : '40';
  const afterSpacing = isBold ? '60' : '40';
  
  return `
<w:p w14:paraId="${Math.random().toString(16).substring(2, 10).toUpperCase()}" w14:textId="77777777">
  <w:pPr>
    ${indXml}
    <w:tabs>
      <w:tab w:val="right" w:leader="dot" w:pos="9360"/>
    </w:tabs>
    <w:spacing w:before="${beforeSpacing}" w:after="${afterSpacing}" w:line="280" w:lineRule="auto"/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      ${boldXml}
      ${szXml}
    </w:rPr>
  </w:pPr>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>${boldXml}${szXml}</w:rPr>
    <w:t xml:space="preserve">${title}</w:t>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>${boldXml}${szXml}</w:rPr>
    <w:tab/>
    <w:t>${page}</w:t>
  </w:r>
</w:p>`;
}

function makeSectionHeader(title) {
  return `
<w:p w14:paraId="${Math.random().toString(16).substring(2, 10).toUpperCase()}" w14:textId="77777777">
  <w:pPr>
    <w:spacing w:before="240" w:after="180" w:line="360" w:lineRule="auto"/>
    <w:jc w:val="center"/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/><w:bCs/>
      <w:sz w:val="28"/><w:szCs w:val="28"/>
    </w:rPr>
  </w:pPr>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
    <w:t>${title}</w:t>
  </w:r>
</w:p>`;
}

function makePageBreak() {
  return `
<w:p w14:paraId="${Math.random().toString(16).substring(2, 10).toUpperCase()}" w14:textId="77777777">
  <w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
  <w:r><w:br w:type="page"/></w:r>
</w:p>`;
}

function makeTableHeader(leftCol, rightCol) {
  return `
<w:p w14:paraId="${Math.random().toString(16).substring(2, 10).toUpperCase()}" w14:textId="77777777">
  <w:pPr>
    <w:tabs>
      <w:tab w:val="right" w:pos="9360"/>
    </w:tabs>
    <w:spacing w:before="120" w:after="120" w:line="280" w:lineRule="auto"/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/><w:bCs/>
      <w:sz w:val="22"/><w:szCs w:val="22"/>
    </w:rPr>
  </w:pPr>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
    <w:t xml:space="preserve">${leftCol}</w:t>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
    <w:tab/>
    <w:t>${rightCol}</w:t>
  </w:r>
</w:p>`;
}

// BUILD TOC XML
let tocXml = makeSectionHeader('TABLE OF CONTENTS');
tocXml += makeTOCItem('TITLE PAGE', 'i', true);
tocXml += makeTOCItem('APPROVAL SHEET', 'ii', true);
tocXml += makeTOCItem('ACKNOWLEDGEMENT', 'iii', true);
tocXml += makeTOCItem('ABSTRACT', 'iv', true);
tocXml += makeTOCItem('TABLE OF CONTENTS', 'v', true);
tocXml += makeTOCItem('LIST OF TABLES', 'vi', true);
tocXml += makeTOCItem('LIST OF FIGURES', 'vii', true);

tocXml += makeTOCItem('CHAPTER I: INTRODUCTION', '1', true);
tocXml += makeTOCItem('Background of the Study', '1', false, 360);
tocXml += makeTOCItem('Conceptual Framework', '3', false, 360);
tocXml += makeTOCItem('Statement of the Problem', '4', false, 360);
tocXml += makeTOCItem('Significance of the Study', '6', false, 360);
tocXml += makeTOCItem('Scope and Delimitation of the Study', '7', false, 360);
tocXml += makeTOCItem('Definition of Terms', '8', false, 360);

tocXml += makeTOCItem('CHAPTER II: REVIEW OF RELATED LITERATURE AND STUDIES', '10', true);
tocXml += makeTOCItem('Related Literature and Studies', '10', false, 360);
tocXml += makeTOCItem('Technology Review', '17', false, 360);
tocXml += makeTOCItem('Synthesis of the State-of-the-Art', '22', false, 360);

tocXml += makeTOCItem('CHAPTER III: RESEARCH DESIGN AND METHODOLOGY', '24', true);
tocXml += makeTOCItem('Research Design', '24', false, 360);
tocXml += makeTOCItem('Research Locale', '26', false, 360);
tocXml += makeTOCItem('Population and Sampling Technique', '27', false, 360);
tocXml += makeTOCItem('Research Instruments', '29', false, 360);
tocXml += makeTOCItem('Data Gathering Procedures', '31', false, 360);
tocXml += makeTOCItem('Statistical Treatment of Data', '32', false, 360);
tocXml += makeTOCItem('Software Development Methodology (Agile Scrum)', '34', false, 360);

tocXml += makeTOCItem('CHAPTER IV: SYSTEM DESIGN AND RESULTS', '40', true);
tocXml += makeTOCItem('1. Overview of the System', '40', false, 360);
tocXml += makeTOCItem('2. System Development Based on Agile Methodology', '43', false, 360);
tocXml += makeTOCItem('a. Sprint 1: Multi-School Catalog Search & Holding Discovery', '43', false, 540);
tocXml += makeTOCItem('b. Sprint 2: Inter-Library Borrow Request & Access Pass Engine', '47', false, 540);
tocXml += makeTOCItem('c. Sprint 3: Librarian Approval, Verification & Circulation', '51', false, 540);
tocXml += makeTOCItem('3. System Design and Architecture', '55', false, 360);
tocXml += makeTOCItem('a. Overall System Architecture Model', '55', false, 540);
tocXml += makeTOCItem('b. System Flow and Operational Lifecycle', '57', false, 540);
tocXml += makeTOCItem('c. Actor-to-Use-Case Interaction Diagram', '58', false, 540);
tocXml += makeTOCItem('d. Data Flow Context Diagram (Level 0)', '59', false, 540);
tocXml += makeTOCItem('e. Data Flow Diagram Level 1', '60', false, 540);
tocXml += makeTOCItem('f. Entity-Relationship Diagram (ERD)', '61', false, 540);
tocXml += makeTOCItem('g. Relational Database Tables and Schema Attributes', '62', false, 540);
tocXml += makeTOCItem('h. System Navigation Structure and Site Map Hierarchy', '64', false, 540);
tocXml += makeTOCItem('i. Cloud Deployment Architecture and Network Topology', '65', false, 540);
tocXml += makeTOCItem('j. User Interface (UI) Screen Presentations', '66', false, 540);
tocXml += makeTOCItem('k. Hardware and Software Specifications', '68', false, 540);
tocXml += makeTOCItem('l. System Security and Data Privacy Controls', '70', false, 540);
tocXml += makeTOCItem('m. Alignment with Research Objectives', '72', false, 540);
tocXml += makeTOCItem('4. System Testing and Verification Results', '73', false, 360);
tocXml += makeTOCItem('a. Test Objectives and Scope', '73', false, 540);
tocXml += makeTOCItem('b. Requirements Traceability Matrix and Test Cases', '74', false, 540);
tocXml += makeTOCItem('c. Testing Results Summary', '76', false, 540);
tocXml += makeTOCItem('5. System Evaluation Results', '78', false, 360);
tocXml += makeTOCItem('a. Evaluation Framework (ISO/IEC 25010 Quality Model)', '78', false, 540);
tocXml += makeTOCItem('b. Presentation of Evaluation Results', '79', false, 540);
tocXml += makeTOCItem('c. Interpretation of Evaluation Results', '83', false, 540);
tocXml += makeTOCItem('d. Evaluation in Relation to Research Objectives', '84', false, 540);
tocXml += makeTOCItem('e. Overall Evaluation Findings and Synthesis', '85', false, 540);

tocXml += makeTOCItem('CHAPTER V: SUMMARY, CONCLUSIONS AND RECOMMENDATIONS', '87', true);
tocXml += makeTOCItem('Summary of Findings', '87', false, 360);
tocXml += makeTOCItem('Conclusions', '88', false, 360);
tocXml += makeTOCItem('Recommendations', '90', false, 360);

tocXml += makeTOCItem('BIBLIOGRAPHY', '92', true);
tocXml += makeTOCItem('APPENDICES', '95', true);

// BUILD LIST OF TABLES XML
let lotXml = makePageBreak();
lotXml += makeSectionHeader('LIST OF TABLES');
lotXml += makeTableHeader('TABLE NO.    TITLE', 'PAGE');

const tablesData = [
  { no: 'Table 3.1', title: 'Distribution of Respondents (Purposive Sampling Breakdown)', page: '28' },
  { no: 'Table 4.1', title: 'Demographic Breakdown of Respondents (N = 64)', page: '79' },
  { no: 'Table 4.2', title: 'Summary of Evaluation Results per Quality Characteristic (ISO/IEC 25010)', page: '80' },
  { no: 'Table 4.3', title: 'Evaluation Results for Functional Suitability', page: '81' },
  { no: 'Table 4.4', title: 'Evaluation Results for Performance Efficiency', page: '81' },
  { no: 'Table 4.5', title: 'Evaluation Results for Usability', page: '81' },
  { no: 'Table 4.6', title: 'Evaluation Results for Reliability', page: '82' },
  { no: 'Table 4.7', title: 'Evaluation Results for Security', page: '82' },
  { no: 'Table 4.8', title: 'Evaluation Results for Maintainability', page: '82' },
  { no: 'Table 4.9', title: 'Evaluation Results for Portability', page: '83' },
  { no: 'Table 4.10', title: 'Synthesis of Evaluation Results in Relation to Research Objectives', page: '84' }
];

tablesData.forEach(t => {
  lotXml += makeTOCItem(`${t.no}    ${t.title}`, t.page, false, 0);
});

// BUILD LIST OF FIGURES XML
let lofXml = makePageBreak();
lofXml += makeSectionHeader('LIST OF FIGURES');
lofXml += makeTableHeader('FIGURE NO.    TITLE', 'PAGE');

const figuresData = [
  { no: 'Figure 1', title: 'Conceptual Framework of LibraLink (Agile SDLC Model)', page: '3' },
  { no: 'Figure 3.1', title: 'Agile Scrum Development Lifecycle Sequence', page: '35' },
  { no: 'Figure 4.1', title: 'Sprint 1 Actor-to-Use-Case Interaction Diagram', page: '44' },
  { no: 'Figure 4.2', title: 'Sprint 1 Context Data Flow Diagram (Level 0)', page: '45' },
  { no: 'Figure 4.3', title: 'Public Landing Page and School Login Interface', page: '46' },
  { no: 'Figure 4.4', title: 'Centralized Cross-School Catalog Search Interface', page: '47' },
  { no: 'Figure 4.5', title: 'Sprint 2 Inter-Library Borrowing & Token Flow Lifecycle', page: '48' },
  { no: 'Figure 4.6', title: 'Student Borrow Request and Access Token Pass Interface', page: '50' },
  { no: 'Figure 4.7', title: 'Librarian Administrative and Token Verification Dashboard', page: '53' },
  { no: 'Figure 4.8', title: 'Overall System Architecture Model of LibraLink', page: '56' },
  { no: 'Figure 4.9', title: 'LibraLink System Flow and Operational Lifecycle Diagram', page: '57' },
  { no: 'Figure 4.10', title: 'Complete LibraLink Actor-to-Use-Case Diagram', page: '58' },
  { no: 'Figure 4.11', title: 'LibraLink Data Flow Context Diagram (Level 0)', page: '59' },
  { no: 'Figure 4.12', title: 'LibraLink Entity-Relationship Diagram (ERD)', page: '61' },
  { no: 'Figure 4.13', title: 'LibraLink Relational Database Tables and Schema Attributes', page: '63' },
  { no: 'Figure 4.14', title: 'Public Landing Page and Institutional Sign-In Interface', page: '66' },
  { no: 'Figure 4.15', title: 'Student Dashboard and Cross-School Catalog Search Interface', page: '67' },
  { no: 'Figure 4.16', title: 'Librarian Administrative and Approval Dashboard Interface', page: '68' }
];

figuresData.forEach(f => {
  lofXml += makeTOCItem(`${f.no}    ${f.title}`, f.page, false, 0);
});

// 6. Splice TOC, LOT, and LOF into docXml
const pTOCStart = docXml.lastIndexOf('<w:p ', docXml.indexOf('<w:t>TABLE OF CONTENTS</w:t>'));
const pCh1Start = docXml.lastIndexOf('<w:p ', docXml.indexOf('Chapter I'));
const pSectStart = docXml.lastIndexOf('<w:p ', pCh1Start - 1);

console.log('Splicing TOC/LOT/LOF between offset:', pTOCStart, 'and', pSectStart);
const combinedFrontMatterXml = tocXml + lotXml + lofXml;

docXml = docXml.substring(0, pTOCStart) + combinedFrontMatterXml + docXml.substring(pSectStart);
console.log('TOC/LOT/LOF spliced! New length:', docXml.length);

// 7. Splice Chapter 4
const pStartCh4 = docXml.lastIndexOf('<w:p ', docXml.indexOf('<w:t>CHAPTER IV</w:t>'));
const pStartCh5 = docXml.lastIndexOf('<w:p ', docXml.indexOf('<w:t>Chapter 5</w:t>'));

console.log('Splicing Chapter 4 between offset:', pStartCh4, 'and', pStartCh5);
const ch4WithBreak = ch4Content + makePageBreak();

docXml = docXml.substring(0, pStartCh4) + ch4WithBreak + docXml.substring(pStartCh5);
console.log('Chapter 4 spliced! Final document.xml length:', docXml.length);

// Write updated document.xml
fs.writeFileSync(docXmlPath, docXml, 'utf8');
console.log('Successfully wrote updated document.xml');

// 8. Re-pack scratch_extracted into Libralink-Final-Updated.docx
console.log('Re-packing into Libralink-Final-Updated.docx...');
const tempZip = path.join(basePath, 'temp_updated.zip');
if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
if (fs.existsSync(updatedDocx)) fs.unlinkSync(updatedDocx);

// Use PowerShell Compress-Archive to pack scratch_extracted
execSync(`powershell -Command "Compress-Archive -Path '${basePath}/scratch_extracted/*' -DestinationPath '${tempZip}' -Force"`);
fs.renameSync(tempZip, updatedDocx);

const finalStats = fs.statSync(updatedDocx);
console.log(`=== COMPLETED SUCCESSFULLY! ===`);
console.log(`Output docx created: ${updatedDocx}`);
console.log(`File size: ${(finalStats.size / (1024 * 1024)).toFixed(2)} MB`);
