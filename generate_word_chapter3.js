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
  ShadingType
} from 'docx';

function createHeading1(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 }
  });
}

function createHeading2(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.CENTER,
    spacing: { before: 180, after: 120 }
  });
}

function createHeading3(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 }
  });
}

function createHeading4(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 24 // 12pt
      })
    ],
    spacing: { before: 140, after: 60 }
  });
}

function createParagraph(text, isItalic = false) {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        italics: isItalic,
        size: 24 // 12pt
      })
    ],
    spacing: { after: 120, line: 360 } // 1.5 line spacing
  });
}

function createBullet(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix + ' ', bold: true, size: 24 }));
  }
  children.push(new TextRun({ text: text, size: 24 }));
  return new Paragraph({
    children: children,
    bullet: { level: 0 },
    spacing: { after: 80 }
  });
}

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
};

function createStyledTable(headers, rows, colWidths = []) {
  const headerRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, size: 22, color: "FFFFFF" })],
        alignment: AlignmentType.CENTER
      })],
      shading: { type: ShadingType.CLEAR, fill: "1E293B" },
      width: colWidths[i] ? { size: colWidths[i], type: WidthType.DXA } : undefined
    }))
  });

  const bodyRows = rows.map((r, rowIdx) => new TableRow({
    children: r.map((cellText, i) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: String(cellText), size: 22 })],
        alignment: AlignmentType.CENTER
      })],
      shading: rowIdx % 2 === 1 ? { type: ShadingType.CLEAR, fill: "F8FAFC" } : undefined,
      width: colWidths[i] ? { size: colWidths[i], type: WidthType.DXA } : undefined
    }))
  }));

  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders
  });
}

async function generateChapter3Docx() {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        createHeading1("CHAPTER III"),
        createHeading2("RESEARCH DESIGN AND METHODOLOGY"),
        createParagraph(""),

        createParagraph(
          "This chapter describes the comprehensive research approach, system development framework, and evaluation techniques utilized in the creation and validation of LibraLink: A Centralized Web-Based Library Management System for Book Resource Sharing across Selected Schools in Pampanga. It details the research design, research locale, population and sampling technique, research instruments, validation procedures, data gathering procedures, statistical tools, software development methodology, and system development tools."
        ),
        createParagraph(
          "The methodology is engineered to support an inter-library resource sharing workflow that allows students to search for books across multiple campuses, verify real-time availability, receive partner institution suggestions, submit inter-library borrow requests, undergo home-institution librarian verification and approval, receive a secure Library Access Token, and gain authorized access to books in accordance with institutional sharing policies."
        ),

        createHeading3("3.1 Research Design"),
        createParagraph(
          "The study employed a developmental research design combined with a descriptive-evaluative approach. Developmental research was chosen because the primary objective was to design, develop, test, and assess a functional software artifact—the LibraLink centralized web-based platform—engineered to solve resource scarcity and accessibility challenges experienced by students across participating school libraries."
        ),
        createParagraph(
          "The descriptive-evaluative technique was utilized to examine the existing challenges, workflows, and operational needs of students and library personnel regarding book discovery, cross-institutional borrowing, and catalog synchronization. The data obtained from this inquiry established the system specifications and functional requirements of LibraLink."
        ),
        createParagraph(
          "The overall operational flow follows the sequence: Search → Availability Check → Partner School Suggestion → Borrow Request → Home Librarian Verification → Approval / Disapproval → Access Token Generation → Partner Library Verification & Book Access."
        ),

        createHeading3("3.2 Research Locale"),
        createParagraph(
          "The study was strictly delimited to the province of Pampanga, Philippines, focusing exclusively on selected participating private higher education institutions within the province:"
        ),
        createBullet("Guagua National College (GNC) – Located in Guagua, Pampanga"),
        createBullet("Santa Rita College (SRC) – Located in Santa Rita, Pampanga"),
        createParagraph(
          "The geographic scope was explicitly confined to the province of Pampanga to establish a controlled, localized inter-library consortium. The geographic proximity of Guagua and Santa Rita makes cross-campus physical visits practical and convenient for students presenting their digital Library Access Tokens to read or borrow books on-site."
        ),

        createHeading3("3.3 Population and Sampling Technique"),
        createParagraph(
          "The researchers employed purposive sampling (judgmental sampling) in selecting respondents. Purposive sampling is the most appropriate method because the study requires respondents who have direct experience with academic library services, understand book borrowing constraints, and possess the operational authority to assess library management workflows."
        ),
        createHeading4("Inclusion Criteria:"),
        createBullet("Must be currently enrolled at GNC or SRC under College, Senior High School, or Junior High School levels.", "Student Respondents:"),
        createBullet("Must possess an active library account or experience using the school library.", "Library Familiarity:"),
        createBullet("Must have access to an internet-capable device to test the web application.", "Device Accessibility:"),
        createBullet("Must be an officially appointed librarian or library staff member of GNC or SRC.", "Librarians / Staff:"),
        createParagraph(""),

        createHeading4("Table 1. Distribution of Respondents (N = 64)"),
        createStyledTable(
          ["Respondent Category", "Guagua National College (GNC)", "Santa Rita College (SRC)", "Total (N)"],
          [
            ["Students (College, SHS, JHS)", "30", "30", "60"],
            ["Librarians / Library Staff", "2", "2", "4"],
            ["TOTAL", "32", "32", "64"]
          ],
          [3500, 2500, 2500, 1500]
        ),
        createParagraph(""),

        createHeading3("3.4 Research Instruments"),
        createParagraph(
          "The researchers constructed a Researcher-Made Evaluation Questionnaire based on the internationally recognized ISO/IEC 25010 Software Product Quality Model. The questionnaire captures Functional Suitability, Usability, Reliability, Performance Efficiency, User Satisfaction, and contribution to United Nations Sustainable Development Goal 4 (SDG 4: Quality Education)."
        ),

        createHeading3("3.5 Validation Procedures"),
        createParagraph(
          "The draft instrument underwent formal content validation by a panel comprising the research adviser, IT experts, and professional head librarians, ensuring clarity, relevance, and alignment with ISO/IEC 25010 standards prior to field administration."
        ),

        createHeading3("3.6 Data Gathering Procedures"),
        createParagraph(
          "The data gathering procedure proceeded systematically: (1) Securing formal administrative permission letters from GNC and SRC authorities; (2) Auditing library workflows and technical requirements; (3) Iterative development of the LibraLink platform; (4) Conducting hands-on simulation sessions where students performed cross-school requests and librarians tested approvals and token verifications; (5) Administering the validated questionnaire; and (6) Collating and analyzing the data."
        ),

        createHeading3("3.7 Statistical Treatment of Data"),
        createParagraph("Frequency and Percentage Formula: P = (f / N) × 100"),
        createParagraph("Weighted Mean Formula: WM = Σ(f · x) / N"),
        createParagraph(""),

        createHeading4("Table 2. Four-Point Likert Scale and Interpretation Criteria"),
        createStyledTable(
          ["Scale Weight", "Score Interval", "Qualitative Interpretation", "System Acceptability Level"],
          [
            ["4", "3.26 - 4.00", "Strongly Agree", "Highly Acceptable"],
            ["3", "2.51 - 3.25", "Agree", "Acceptable"],
            ["2", "1.76 - 2.50", "Disagree", "Moderately Acceptable"],
            ["1", "1.00 - 1.75", "Strongly Disagree", "Not Acceptable"]
          ],
          [2000, 2500, 2800, 2700]
        ),
        createParagraph(""),

        createHeading3("3.8 Software Development Methodology"),
        createParagraph(
          "The researchers utilized the Agile Software Development Methodology, progressing through eight (8) iterative stages: Planning, Requirements Analysis, System Design, Development, Testing, Evaluation, Improvement, and Finalization."
        ),

        createHeading3("3.9 System Development Tools"),
        createParagraph(
          "The technology stack comprises ReactJS (v19) and Vite for frontend presentation, Tailwind CSS for responsive styling, Node.js and Express.js for REST API backend routing, Supabase / PostgreSQL for relational cloud database persistence with Row-Level Security (RLS), and Visual Studio Code, Git, and Postman for development and testing."
        )
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.resolve('c:/xampp/htdocs/libralinkk', 'LibraLink_Chapter_3_Research_Methodology.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log("Successfully generated Chapter 3 Word Document at:", outputPath);
}

generateChapter3Docx().catch(console.error);
