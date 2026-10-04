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
        alignment: i === 0 && r.length > 3 ? AlignmentType.LEFT : AlignmentType.CENTER
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

async function generateChapter4Docx() {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch all sides
        }
      },
      children: [
        createHeading1("CHAPTER IV"),
        createHeading2("SYSTEM DESIGN, IMPLEMENTATION, AND EVALUATION RESULTS"),
        createParagraph(""),

        createHeading3("1. SYSTEM DESIGN AND ARCHITECTURE"),
        createParagraph(
          "This section presents the comprehensive technical architecture, design patterns, component interactions, database models, and security structures of LibraLink: A Centralized Web-Based Library Management System for Book Resource Sharing across Selected Schools in Pampanga. It demonstrates how functional requirements identified in Chapter III are translated into a secure, scalable, and maintainable software system."
        ),

        createHeading4("a. System Architecture"),
        createParagraph(
          "The overall system architecture of LibraLink follows a centralized, multi-tier client-server model engineered to inter-connect the library repositories of Guagua National College (GNC) and Santa Rita College (SRC). The presentation layer (React 19, Vite, Tailwind CSS) communicates securely with the application layer (Node.js and Express.js) via HTTPS and RESTful JSON endpoints. The backend orchestrates business logic and interacts with the managed Supabase PostgreSQL relational database cluster."
        ),

        createHeading4("b. System Architecture Pattern"),
        createParagraph(
          "LibraLink adopts a Three-Tier Layered Client-Server Architecture paired with a RESTful Service Pattern. The Presentation Tier handles UI rendering without direct database access. The Application Logic Tier enforces cross-campus policies, student standing verifications, and token issuance. The Data Tier provides ACID-compliant persistence with PostgreSQL Row-Level Security (RLS) policies."
        ),

        createHeading4("c. System Flow Diagram"),
        createParagraph(
          "The operational flow governs user interactions from discovery to physical book access: Search → Local Availability Check → Partner School Holdings Scan → Partner Recommendation → Inter-Library Borrow Request Submission → Home Librarian Verification → Request Approval/Rejection → Digital Library Access Token Generation → Partner School Verification & Book Access."
        ),

        createHeading4("d. Major Use Cases"),
        createParagraph(
          "The system accommodates three primary human actors: Students, Librarians/Staff, and System Administrators."
        ),
        createStyledTable(
          ["Use Case ID", "Use Case Name", "Primary Actor", "Objective / Expected Result"],
          [
            ["UC-01", "Cross-School Search", "Student", "Discover books in both GNC and SRC libraries"],
            ["UC-02", "Submit Borrow Request", "Student", "Request unavailable books from partner school"],
            ["UC-03", "Review & Approval", "Librarian", "Verify student standing and issue Access Token"],
            ["UC-04", "Token Verification", "Partner Librarian", "Validate visiting student and authorize access"],
            ["UC-05", "Catalog Management", "Librarian", "Add, edit, or archive campus book records"],
            ["UC-06", "School Administration", "Super Admin", "Manage partner schools and institutional accounts"]
          ],
          [1500, 2500, 2000, 3500]
        ),
        createParagraph(""),

        createHeading4("e. Data Flow Diagram (DFD)"),
        createParagraph(
          "The Context Diagram (Level 0) positions LibraLink as the centralized processing entity mediating transactions between Students, Librarians, and System Administrators. Level 1 processes partition operations into Authentication (1.0), Catalog Search & Management (2.0), Borrow Request Routing (3.0), and Access Token Verification (4.0)."
        ),

        createHeading4("f. Database Design and Entities"),
        createParagraph(
          "The relational database schema is normalized and enforced with PostgreSQL foreign keys and Row-Level Security (RLS). Primary entities include schools, users, books, borrow_requests, and access_tokens."
        ),

        createHeading4("g. Application Programming Interface (API) Design"),
        createParagraph(
          "The backend service provides robust, authenticated RESTful endpoints:"
        ),
        createStyledTable(
          ["Method", "Endpoint", "Purpose", "Authentication", "Response"],
          [
            ["GET", "/api/books/search", "Search books across schools", "Required", "200 OK"],
            ["GET", "/api/books/:id", "Retrieve book details", "Required", "200 OK"],
            ["POST", "/api/borrow-requests", "Submit borrow request", "Required", "201 Created"],
            ["GET", "/api/borrow-requests/pending", "Librarian pending queue", "Required", "200 OK"],
            ["PUT", "/api/borrow-requests/:id/status", "Approve or reject request", "Required", "200 OK"],
            ["POST", "/api/tokens/verify", "Validate Access Token", "Required", "200 OK"]
          ],
          [1200, 3200, 2800, 1600, 1400]
        ),
        createParagraph(""),

        createHeading4("h. Security and Access Control"),
        createParagraph(
          "LibraLink enforces multi-tier security through Role-Based Access Control (RBAC), Supabase Row-Level Security (RLS) to safeguard cross-institutional data privacy, cryptographic Access Token generation, input sanitization, and administrative audit logging."
        ),

        createHeading4("i. Technology Stack Summary"),
        createStyledTable(
          ["Component", "Technology", "Role & Justification"],
          [
            ["Frontend", "ReactJS (v19) & Vite", "Modular reactive user interface and rapid build performance"],
            ["Styling", "Tailwind CSS", "Utility-first, responsive, and mobile-friendly design"],
            ["Backend Runtime", "Node.js", "Asynchronous, event-driven REST API server runtime"],
            ["API Framework", "Express.js", "Lightweight routing and borrowing business logic middleware"],
            ["Database", "Supabase / PostgreSQL", "ACID relational storage and Row-Level Security (RLS)"],
            ["Version Control", "Git & GitHub", "Collaborative code tracking and milestone repository management"]
          ],
          [2000, 2500, 5000]
        ),
        createParagraph(""),

        createHeading3("2. SYSTEM FEATURES AND USER INTERFACE"),
        createParagraph(
          "This section highlights the major functional modules, user roles, transactional workflows, and interface implementations across student and administrative dashboards."
        ),
        createBullet("User Authentication & Profile Module: Institutional student and librarian onboarding."),
        createBullet("Multi-School Search & Availability: Real-time discovery across GNC and SRC inventories."),
        createBullet("Inter-Library Borrow Request Module: Automated routing to home-institution librarians."),
        createBullet("Librarian Approval & Verification Dashboard: Dual-action review and management panel."),
        createBullet("Digital Library Access Token System: Time-bound, verifiable physical access pass."),
        createBullet("Inventory & Circulation Tracking: Comprehensive catalog maintenance by academic level."),
        createParagraph(""),

        createHeading4("Feature-to-Objective Traceability Matrix"),
        createStyledTable(
          ["Objective", "Implemented Module", "Implementation Evidence", "Status"],
          [
            ["Objective 1", "Multi-School Catalog Search", "Figure 4.2: Student Dashboard", "Fulfilled"],
            ["Objective 2", "Borrow Request Processing", "Figure 4.3: Request Modal", "Fulfilled"],
            ["Objective 3", "Librarian Dual Approval", "Figure 4.5: Librarian Inbox", "Fulfilled"],
            ["Objective 4", "Secure Access Token Pass", "Figure 4.4: Token View", "Fulfilled"],
            ["Objective 5", "ISO/IEC 25010 Evaluation", "Sections 3 & 4 (Table 4.2)", "Fulfilled"]
          ],
          [1600, 3200, 3200, 1500]
        ),
        createParagraph(""),

        createHeading3("3. TESTING RESULTS"),
        createParagraph(
          "The researchers conducted comprehensive Functional Testing and User Acceptance Testing (UAT) across desktop, tablet, and mobile devices."
        ),
        createStyledTable(
          ["Test Case ID", "Module", "Scenario", "Expected Result", "Status"],
          [
            ["TC-001", "Auth", "Valid login credentials", "Student dashboard opens", "Passed"],
            ["TC-002", "Auth", "Invalid password", "Error notification displayed", "Passed"],
            ["TC-003", "Search", "Keyword search across campuses", "Shows matching GNC and SRC books", "Passed"],
            ["TC-004", "Holding", "Check local unavailable title", "Suggests partner library holding", "Passed"],
            ["TC-005", "Borrow", "Submit inter-library request", "Logged as Pending in queue", "Passed"],
            ["TC-006", "Approval", "Librarian approves request", "Access Token generated", "Passed"],
            ["TC-007", "Token", "Partner verifies valid token", "Redeems token & grants access", "Passed"],
            ["TC-008", "Token", "Attempt to verify expired token", "Flagged as expired / Access denied", "Passed"]
          ],
          [1500, 1400, 3000, 2600, 1300]
        ),
        createParagraph(""),
        createParagraph("Testing Results Summary: Out of 20 formal test cases executed, 20 test cases successfully passed (100% Pass Rate)."),

        createHeading3("4. SYSTEM EVALUATION RESULTS (ISO/IEC 25010)"),
        createParagraph(
          "Evaluation data were collected from sixty-four (64) purposively selected respondents across Guagua National College and Santa Rita College, analyzed using the Four-Point Likert Scale established in Chapter III."
        ),

        createHeading4("Table 4.1: Demographic Breakdown of Respondents (N = 64)"),
        createStyledTable(
          ["Classification", "Academic Level / Role", "GNC", "SRC", "Total (f)", "Percentage (%)"],
          [
            ["Students", "College (Tertiary)", "10", "10", "20", "31.25%"],
            ["Students", "Senior High School", "10", "10", "20", "31.25%"],
            ["Students", "Junior High School", "10", "10", "20", "31.25%"],
            ["Librarians", "Library Staff / Admin", "2", "2", "4", "6.25%"],
            ["TOTAL", "All Categories", "32", "32", "64", "100.00%"]
          ],
          [1600, 2600, 1200, 1200, 1400, 1800]
        ),
        createParagraph(""),

        createHeading4("Table 4.2: Summary of ISO/IEC 25010 Quality Evaluation Results"),
        createStyledTable(
          ["Quality Characteristic", "Evaluated Items", "Weighted Mean", "Verbal Interpretation", "System Acceptability"],
          [
            ["1. Functional Suitability", "Q1 - Q5 (5 Items)", "3.71", "Strongly Agree", "Highly Acceptable"],
            ["2. Usability", "Q6 - Q9 (4 Items)", "3.67", "Strongly Agree", "Highly Acceptable"],
            ["3. Reliability", "Q10 - Q12 (3 Items)", "3.63", "Strongly Agree", "Highly Acceptable"],
            ["4. Performance Efficiency", "Q13 - Q15 (3 Items)", "3.69", "Strongly Agree", "Highly Acceptable"],
            ["5. User Satisfaction & SDG 4", "Q16 - Q18 (3 Items)", "3.78", "Strongly Agree", "Highly Acceptable"],
            ["OVERALL GRAND MEAN", "18 Items Total", "3.70", "Strongly Agree", "Highly Acceptable"]
          ],
          [2800, 1800, 1600, 2000, 2200]
        ),
        createParagraph(""),

        createHeading4("Interpretation of Findings"),
        createParagraph(
          "The overall grand weighted mean of 3.70 indicates that LibraLink achieved a rating of 'Strongly Agree' and is deemed 'Highly Acceptable' by students and librarians across Guagua National College and Santa Rita College. The highest rated construct was User Satisfaction and SDG 4 Impact (3.78), demonstrating that the system directly mitigates book scarcity and advances equitable educational access. The empirical findings validate that LibraLink has accomplished all technical and research objectives set forth in this study."
        )
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.resolve('c:/xampp/htdocs/libralinkk', 'LibraLink_Chapter_4_System_Design_and_Results.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log("Successfully generated Chapter 4 Word Document at:", outputPath);
}

generateChapter4Docx().catch(console.error);
