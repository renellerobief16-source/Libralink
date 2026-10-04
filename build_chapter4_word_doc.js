import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  ImageRun
} from 'docx';

const basePath = 'c:/xampp/htdocs/libralinkk';
const mdPath = path.resolve(basePath, 'CHAPTER_4_SYSTEM_DESIGN_AND_RESULTS.md');
const outDocxPath = path.resolve(basePath, 'LibraLink_Chapter_4_Presentation_Analysis.docx');

// Figure image map
const figureImages = {
  '4.1': path.resolve(basePath, 'docs/png/1_libralink_use_case_diagram.png'),
  '4.2': path.resolve(basePath, 'docs/png/2_libralink_context_diagram_level_0.png'),
  '4.3': path.resolve(basePath, 'public/landing.png'),
  '4.4': path.resolve(basePath, 'public/student.png'),
  '4.5': path.resolve(basePath, 'docs/png/3_libralink_system_flow_lifecycle.png'),
  '4.6': path.resolve(basePath, 'public/student.png'),
  '4.7': path.resolve(basePath, 'public/admin.png'),
  // 4.8 is the ASCII model
  '4.9': path.resolve(basePath, 'docs/png/3_libralink_system_flow_lifecycle.png'),
  '4.10': path.resolve(basePath, 'docs/png/1_libralink_use_case_diagram.png'),
  '4.11': path.resolve(basePath, 'docs/png/2_libralink_context_diagram_level_0.png'),
  '4.12': path.resolve(basePath, 'docs/png/5_libralink_entity_relationship_diagram.png'),
  '4.13': path.resolve(basePath, 'docs/png/4_libralink_database_tables.png'),
  '4.14': path.resolve(basePath, 'public/landing.png'),
  '4.15': path.resolve(basePath, 'public/student.png'),
  '4.16': path.resolve(basePath, 'public/admin.png'),
};

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
};

function parseInlineFormatting(text) {
  // Regex to parse **bold** and *italic* and `code`
  const runs = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|[^*`]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const chunk = match[0];
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length >= 4) {
      runs.push(new TextRun({ text: chunk.slice(2, -2), bold: true, size: 24 }));
    } else if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length >= 2) {
      runs.push(new TextRun({ text: chunk.slice(1, -1), italics: true, size: 24 }));
    } else if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length >= 2) {
      runs.push(new TextRun({ text: chunk.slice(1, -1), font: "Courier New", size: 22 }));
    } else {
      runs.push(new TextRun({ text: chunk, size: 24 }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: text, size: 24 })];
}

function createParagraphFromText(line) {
  const children = parseInlineFormatting(line);
  return new Paragraph({
    children: children,
    spacing: { after: 120, line: 360 } // 1.5 line spacing
  });
}

function createBulletFromText(line) {
  const cleanLine = line.replace(/^\s*\*\s*/, '');
  const children = parseInlineFormatting(cleanLine);
  return new Paragraph({
    children: children,
    bullet: { level: 0 },
    spacing: { after: 80, line: 320 }
  });
}

function createImageParagraph(imgFilePath, targetWidth = 520, targetHeight = 280) {
  if (fs.existsSync(imgFilePath)) {
    const data = fs.readFileSync(imgFilePath);
    return new Paragraph({
      children: [
        new ImageRun({
          data: data,
          transformation: {
            width: targetWidth,
            height: targetHeight
          }
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 80 }
    });
  }
  return null;
}

function createCaption(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        bold: true,
        italics: true,
        size: 22
      })
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 160 }
  });
}

function buildTable(tableLines) {
  if (tableLines.length < 2) return null;
  const parseRow = (line) => {
    return line
      .split('|')
      .slice(1, -1)
      .map(c => c.trim().replace(/<br>/g, '\n'));
  };

  const headerCells = parseRow(tableLines[0]);
  const rows = [];
  for (let i = 2; i < tableLines.length; i++) {
    if (tableLines[i].includes('|')) {
      rows.push(parseRow(tableLines[i]));
    }
  }

  const headerRow = new TableRow({
    children: headerCells.map(h => new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 22 })],
          alignment: AlignmentType.CENTER
        })
      ],
      shading: { type: ShadingType.CLEAR, fill: "1E293B" }
    }))
  });

  const bodyRows = rows.map((r, rowIdx) => new TableRow({
    children: r.map((cellText, cellIdx) => new TableCell({
      children: cellText.split('\n').map(pText => new Paragraph({
        children: parseInlineFormatting(pText),
        alignment: cellIdx === 0 && r.length > 3 ? AlignmentType.LEFT : AlignmentType.CENTER
      })),
      shading: rowIdx % 2 === 1 ? { type: ShadingType.CLEAR, fill: "F8FAFC" } : undefined
    }))
  }));

  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders
  });
}

async function convertMarkdownToDocx() {
  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split(/\r?\n/);

  const docChildren = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let inTable = false;
  let tableBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // flush code block
        inCodeBlock = false;
        const codeText = codeBuffer.join('\n');
        docChildren.push(new Paragraph({
          children: [new TextRun({ text: codeText, font: "Courier New", size: 18 })],
          shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
          spacing: { before: 100, after: 120 }
        }));
        codeBuffer = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Handle markdown tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      inTable = false;
      const t = buildTable(tableBuffer);
      if (t) docChildren.push(t);
      tableBuffer = [];
    }

    // Empty lines or dividers
    if (!line.trim() || line.trim() === '---') {
      continue;
    }

    // Check for Figures
    const figMatch = line.match(/Figure\s+(4\.\d+)/i);
    if (figMatch) {
      const figNum = figMatch[1];
      const cleanCaption = line.replace(/^\*+|\*+$/g, '').trim();

      // If an image exists for this figure number, insert it!
      if (figureImages[figNum]) {
        const imgP = createImageParagraph(figureImages[figNum]);
        if (imgP) {
          docChildren.push(imgP);
        }
      }
      docChildren.push(createCaption(cleanCaption));
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      docChildren.push(new Paragraph({
        text: line.replace('# ', '').trim(),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 }
      }));
    } else if (line.startsWith('## ')) {
      docChildren.push(new Paragraph({
        text: line.replace('## ', '').trim(),
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 120 }
      }));
    } else if (line.startsWith('### ')) {
      docChildren.push(new Paragraph({
        text: line.replace('### ', '').trim(),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 80 }
      }));
    } else if (line.startsWith('#### ')) {
      docChildren.push(new Paragraph({
        text: line.replace('#### ', '').trim(),
        heading: HeadingLevel.HEADING_4,
        spacing: { before: 140, after: 60 }
      }));
    } else if (line.startsWith('##### ')) {
      docChildren.push(new Paragraph({
        children: [new TextRun({ text: line.replace('##### ', '').trim(), bold: true, size: 24 })],
        spacing: { before: 120, after: 60 }
      }));
    } else if (line.startsWith('###### ')) {
      docChildren.push(new Paragraph({
        children: [new TextRun({ text: line.replace('###### ', '').trim(), bold: true, size: 22 })],
        spacing: { before: 100, after: 40 }
      }));
    } else if (line.trim().startsWith('* ')) {
      docChildren.push(createBulletFromText(line));
    } else if (line.trim().match(/^\d+\.\s+/)) {
      // Numbered items
      docChildren.push(new Paragraph({
        children: parseInlineFormatting(line),
        spacing: { after: 80, line: 360 }
      }));
    } else {
      docChildren.push(createParagraphFromText(line));
    }
  }

  // If table was at the very end
  if (inTable && tableBuffer.length > 0) {
    const t = buildTable(tableBuffer);
    if (t) docChildren.push(t);
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch margins
        }
      },
      children: docChildren
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outDocxPath, buffer);
  console.log(`Successfully generated: ${outDocxPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

convertMarkdownToDocx().catch(err => {
  console.error("Error generating Word doc:", err);
  process.exit(1);
});
