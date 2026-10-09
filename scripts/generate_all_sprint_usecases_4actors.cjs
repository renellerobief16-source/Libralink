const fs = require('fs');

// Common Actor SVG helper
function renderActor(x, y, name, roleCode) {
  return `
    <g transform="translate(${x}, ${y})">
      <circle cx="0" cy="-28" r="14" fill="#ffffff" stroke="#000000" stroke-width="2" />
      <line x1="0" y1="-14" x2="0" y2="18" stroke="#000000" stroke-width="2" />
      <line x1="-22" y1="-4" x2="22" y2="-4" stroke="#000000" stroke-width="2" />
      <line x1="0" y1="18" x2="-18" y2="46" stroke="#000000" stroke-width="2" />
      <line x1="0" y1="18" x2="18" y2="46" stroke="#000000" stroke-width="2" />
      <text x="0" y="66" font-size="14" font-weight="800" fill="#000000" text-anchor="middle">${name}</text>
      <rect x="-48" y="73" width="96" height="18" rx="3" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
      <text x="0" y="86" font-size="9.5" font-weight="700" fill="#475569" text-anchor="middle">${roleCode}</text>
    </g>
  `;
}

// Common Use Case Oval helper
function renderOval(x, y, rx, ry, line1, line2 = '', isHighlighted = false, isDashed = false) {
  const strokeWidth = isHighlighted ? 2.4 : 1.5;
  const strokeDash = isDashed ? 'stroke-dasharray="4,3"' : '';
  const fill = isHighlighted ? '#f8fafc' : (isDashed ? '#fbfcfe' : '#ffffff');
  return `
    <g transform="translate(${x}, ${y})">
      <ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="${fill}" stroke="#000000" stroke-width="${strokeWidth}" ${strokeDash} />
      ${line2 ? `
        <text x="0" y="-3" font-size="12" font-weight="${isHighlighted ? '800' : '600'}" fill="#000000" text-anchor="middle">${line1}</text>
        <text x="0" y="14" font-size="12" font-weight="${isHighlighted ? '800' : '600'}" fill="#000000" text-anchor="middle">${line2}</text>
      ` : `
        <text x="0" y="4" font-size="12.5" font-weight="${isHighlighted ? '800' : '600'}" fill="#000000" text-anchor="middle">${line1}</text>
      `}
    </g>
  `;
}

// UML Relationship line helper
function renderRelation(x1, y1, x2, y2, type = 'include') {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const label = type === 'include' ? '&lt;&lt;include&gt;&gt;' : '&lt;&lt;extend&gt;&gt;';
  const boxW = type === 'include' ? 68 : 66;
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000000" stroke-width="1.3" stroke-dasharray="5,4" marker-end="url(#uc-arrow)" />
    <rect x="${midX - (boxW / 2)}" y="${midY - 8}" width="${boxW}" height="16" rx="2" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8" />
    <text x="${midX}" y="${midY + 4}" font-size="9" font-weight="700" fill="#0f172a" text-anchor="middle">${label}</text>
  `;
}

// ========================================================
// SPRINT 1 USE CASE DIAGRAM (SIMPLE TERMS)
// ========================================================
function getSprint1Svg() {
  const width = 1420;
  const height = 960;

  return `
  <svg id="svg-sprint1" viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
    <defs>
      <marker id="uc-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5" fill="none" stroke="#000000" stroke-width="1.6" />
      </marker>
    </defs>

    <!-- Header Block -->
    <g transform="translate(60, 22)">
      <rect x="0" y="0" width="130" height="28" rx="5" fill="#000000" />
      <text x="65" y="19" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle" letter-spacing="1">SPRINT 1</text>
      
      <rect x="140" y="0" width="100" height="28" rx="5" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2" />
      <text x="190" y="19" fill="#0f172a" font-size="13" font-weight="800" text-anchor="middle">Figure 4.1</text>
      
      <text x="255" y="20" fill="#000000" font-size="17" font-weight="800">Sprint 1: Cross-School Catalog Search &amp; Holdings Indexing</text>
      <text x="255" y="38" fill="#555555" font-size="11.5" font-weight="500">UML Use Case Specification Featuring Clean Direct Terms Across Four (4) Institutional Roles</text>
    </g>

    <!-- System Boundary Box -->
    <rect x="220" y="78" width="980" height="855" rx="8" fill="#ffffff" stroke="#000000" stroke-width="2.2" />
    
    <!-- Header Banner -->
    <rect x="235" y="90" width="950" height="34" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.2" />
    <text x="250" y="112" font-size="14" font-weight="900" fill="#000000" letter-spacing="0.5">LibraLink System — SPRINT 1: CATALOG SEARCH &amp; HOLDINGS DISCOVERY</text>
    <text x="1170" y="112" font-size="11" font-weight="700" fill="#475569" text-anchor="end">4 User Roles + Simple Terms</text>

    <!-- 4 ACTORS -->
    ${renderActor(110, 340, 'Student', 'Role 4 (Borrower)')}
    ${renderActor(110, 750, 'Librarian', 'Role 3 (Desk Staff)')}
    ${renderActor(1310, 340, 'Admin-Librarian', 'Head Librarian')}
    ${renderActor(1310, 750, 'Super-Admin', 'Role 1 (System Admin)')}

    <!-- CENTRAL LOGIN USE CASE -->
    ${renderOval(710, 165, 115, 30, 'Login', '', true)}

    <!-- USE CASES (OVALS) -->
    <!-- Student (Sprint 1) -->
    ${renderOval(400, 240, 115, 25, 'User Onboarding')}
    ${renderOval(400, 310, 110, 25, 'Search Books')}
    ${renderOval(400, 380, 115, 25, 'Filter Books')}
    ${renderOval(400, 450, 115, 25, 'Check Availability')}
    ${renderOval(400, 520, 115, 25, 'Save Favorites')}

    <!-- Sub-process: Partner Suggestion -->
    ${renderOval(710, 310, 120, 27, 'Partner Suggestion', '', false, true)}

    <!-- Librarian (Sprint 1) -->
    ${renderOval(400, 650, 115, 25, 'Browse Books')}
    ${renderOval(400, 720, 110, 25, 'Add Book')}
    ${renderOval(400, 790, 115, 25, 'Manage Copies')}
    ${renderOval(400, 860, 115, 25, 'Update Book')}

    <!-- Admin-Librarian (Sprint 1) -->
    ${renderOval(1020, 240, 110, 25, 'Import Books')}
    ${renderOval(1020, 310, 115, 25, 'Book Categories')}
    ${renderOval(1020, 380, 115, 25, 'Library Settings')}
    ${renderOval(1020, 450, 115, 25, 'Manage Catalog')}

    <!-- Sub-process: Verify CSV File -->
    ${renderOval(710, 420, 120, 27, 'Verify CSV File', '', false, true)}

    <!-- Super-Admin (Sprint 1) -->
    ${renderOval(1020, 690, 115, 25, 'Manage Schools')}
    ${renderOval(1020, 760, 115, 25, 'School Profiles')}
    ${renderOval(1020, 830, 115, 25, 'Database Sync')}

    <!-- DIRECT SOLID LOGIN LINES -->
    <line x1="145" y1="300" x2="600" y2="165" stroke="#000000" stroke-width="1.8" />
    <line x1="145" y1="715" x2="610" y2="178" stroke="#000000" stroke-width="1.8" />
    <line x1="1275" y1="300" x2="820" y2="165" stroke="#000000" stroke-width="1.8" />
    <line x1="1275" y1="715" x2="810" y2="178" stroke="#000000" stroke-width="1.8" />

    <!-- CLEAN ASSOCIATION LINES: STUDENT -->
    <line x1="135" y1="325" x2="285" y2="240" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="335" x2="290" y2="310" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="350" x2="285" y2="380" stroke="#000000" stroke-width="1.3" />
    <line x1="140" y1="365" x2="285" y2="450" stroke="#000000" stroke-width="1.3" />
    <line x1="135" y1="380" x2="285" y2="520" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: LIBRARIAN -->
    <line x1="135" y1="730" x2="280" y2="650" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="745" x2="290" y2="720" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="760" x2="285" y2="790" stroke="#000000" stroke-width="1.3" />
    <line x1="135" y1="775" x2="285" y2="860" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: ADMIN-LIBRARIAN -->
    <line x1="1285" y1="325" x2="1130" y2="240" stroke="#000000" stroke-width="1.3" />
    <line x1="1275" y1="335" x2="1135" y2="310" stroke="#000000" stroke-width="1.3" />
    <line x1="1275" y1="350" x2="1135" y2="380" stroke="#000000" stroke-width="1.3" />
    <line x1="1285" y1="365" x2="1135" y2="450" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: SUPER-ADMIN -->
    <line x1="1285" y1="735" x2="1135" y2="690" stroke="#000000" stroke-width="1.3" />
    <line x1="1275" y1="750" x2="1135" y2="760" stroke="#000000" stroke-width="1.3" />
    <line x1="1285" y1="765" x2="1135" y2="830" stroke="#000000" stroke-width="1.3" />

    <!-- UML RELATIONSHIPS -->
    ${renderRelation(510, 310, 590, 310, 'extend')}
    ${renderRelation(910, 240, 825, 410, 'include')}
  </svg>
  `;
}

// ========================================================
// SPRINT 2 USE CASE DIAGRAM (SIMPLE TERMS)
// ========================================================
function getSprint2Svg() {
  const width = 1420;
  const height = 960;

  return `
  <svg id="svg-sprint2" viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
    <defs>
      <marker id="uc-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5" fill="none" stroke="#000000" stroke-width="1.6" />
      </marker>
    </defs>

    <!-- Header Block -->
    <g transform="translate(60, 22)">
      <rect x="0" y="0" width="130" height="28" rx="5" fill="#000000" />
      <text x="65" y="19" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle" letter-spacing="1">SPRINT 2</text>
      
      <rect x="140" y="0" width="100" height="28" rx="5" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2" />
      <text x="190" y="19" fill="#0f172a" font-size="13" font-weight="800" text-anchor="middle">Figure 4.2</text>
      
      <text x="255" y="20" fill="#000000" font-size="17" font-weight="800">Sprint 2: Inter-Library Request Routing &amp; Lending Approvals</text>
      <text x="255" y="38" fill="#555555" font-size="11.5" font-weight="500">UML Use Case Specification Featuring Clean Direct Terms Across Four (4) Institutional Roles</text>
    </g>

    <!-- System Boundary Box -->
    <rect x="220" y="78" width="980" height="855" rx="8" fill="#ffffff" stroke="#000000" stroke-width="2.2" />
    
    <!-- Header Banner -->
    <rect x="235" y="90" width="950" height="34" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.2" />
    <text x="250" y="112" font-size="14" font-weight="900" fill="#000000" letter-spacing="0.5">LibraLink System — SPRINT 2: BORROW REQUEST &amp; APPROVAL ENGINE</text>
    <text x="1170" y="112" font-size="11" font-weight="700" fill="#475569" text-anchor="end">4 User Roles + Simple Terms</text>

    <!-- 4 ACTORS -->
    ${renderActor(110, 340, 'Student', 'Role 4 (Borrower)')}
    ${renderActor(110, 750, 'Librarian', 'Role 3 (Home Staff)')}
    ${renderActor(1310, 340, 'Admin-Librarian', 'Partner Head Admin')}
    ${renderActor(1310, 750, 'Super-Admin', 'Role 1 (System Admin)')}

    <!-- CENTRAL LOGIN USE CASE -->
    ${renderOval(710, 165, 115, 30, 'Login', '', true)}

    <!-- USE CASES (OVALS) -->
    <!-- Student (Sprint 2) -->
    ${renderOval(400, 240, 115, 25, 'Select Book')}
    ${renderOval(400, 310, 115, 25, 'Check Availability')}
    ${renderOval(400, 380, 115, 25, 'Submit Request')}
    ${renderOval(400, 450, 115, 25, 'Track Request')}
    ${renderOval(400, 520, 115, 25, 'View QR Pass')}

    <!-- Central Workflow Engines -->
    ${renderOval(710, 380, 125, 27, 'Dual Approval', '', true)}
    ${renderOval(710, 490, 125, 27, 'Generate QR Pass', '', false, true)}
    ${renderOval(710, 720, 125, 27, 'Check Eligibility', '', false, true)}

    <!-- Librarian (Sprint 2) -->
    ${renderOval(400, 650, 115, 25, 'Review Requests')}
    ${renderOval(400, 720, 120, 25, 'Check Student Status')}
    ${renderOval(400, 790, 115, 25, 'Approve Request')}
    ${renderOval(400, 860, 115, 25, 'Decline Request')}

    <!-- Admin-Librarian (Sprint 2) -->
    ${renderOval(1020, 240, 115, 25, 'Partner Inbox')}
    ${renderOval(1020, 310, 115, 25, 'Check Shelf Copy')}
    ${renderOval(1020, 380, 115, 25, 'Authorize Loan')}
    ${renderOval(1020, 450, 115, 25, 'Borrowing Policies')}

    <!-- Super-Admin (Sprint 2) -->
    ${renderOval(1020, 680, 115, 25, 'Monitor Requests')}
    ${renderOval(1020, 750, 115, 25, 'Lending Analytics')}
    ${renderOval(1020, 820, 115, 25, 'Lending Limits')}

    <!-- DIRECT SOLID LOGIN LINES -->
    <line x1="145" y1="300" x2="600" y2="165" stroke="#000000" stroke-width="1.8" />
    <line x1="145" y1="715" x2="610" y2="178" stroke="#000000" stroke-width="1.8" />
    <line x1="1275" y1="300" x2="820" y2="165" stroke="#000000" stroke-width="1.8" />
    <line x1="1275" y1="715" x2="810" y2="178" stroke="#000000" stroke-width="1.8" />

    <!-- CLEAN ASSOCIATION LINES: STUDENT -->
    <line x1="135" y1="325" x2="285" y2="240" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="335" x2="285" y2="310" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="350" x2="285" y2="380" stroke="#000000" stroke-width="1.3" />
    <line x1="140" y1="365" x2="285" y2="450" stroke="#000000" stroke-width="1.3" />
    <line x1="135" y1="380" x2="285" y2="520" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: LIBRARIAN -->
    <line x1="135" y1="730" x2="285" y2="650" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="745" x2="280" y2="720" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="760" x2="285" y2="790" stroke="#000000" stroke-width="1.3" />
    <line x1="135" y1="775" x2="285" y2="860" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: ADMIN-LIBRARIAN -->
    <line x1="1285" y1="325" x2="1135" y2="240" stroke="#000000" stroke-width="1.3" />
    <line x1="1275" y1="335" x2="1135" y2="310" stroke="#000000" stroke-width="1.3" />
    <line x1="1275" y1="350" x2="1135" y2="380" stroke="#000000" stroke-width="1.3" />
    <line x1="1285" y1="365" x2="1135" y2="450" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: SUPER-ADMIN -->
    <line x1="1285" y1="735" x2="1135" y2="680" stroke="#000000" stroke-width="1.3" />
    <line x1="1275" y1="750" x2="1135" y2="750" stroke="#000000" stroke-width="1.3" />
    <line x1="1285" y1="765" x2="1135" y2="820" stroke="#000000" stroke-width="1.3" />

    <!-- UML RELATIONSHIPS -->
    ${renderRelation(515, 380, 585, 380, 'include')}
    ${renderRelation(515, 520, 585, 490, 'include')}
    ${renderRelation(520, 720, 585, 720, 'include')}
    ${renderRelation(905, 380, 835, 380, 'include')}
  </svg>
  `;
}

// ========================================================
// SPRINT 3 USE CASE DIAGRAM (SIMPLE TERMS)
// ========================================================
function getSprint3Svg() {
  const width = 1420;
  const height = 980;

  return `
  <svg id="svg-sprint3" viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
    <defs>
      <marker id="uc-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5" fill="none" stroke="#000000" stroke-width="1.6" />
      </marker>
    </defs>

    <!-- Header Block -->
    <g transform="translate(60, 22)">
      <rect x="0" y="0" width="130" height="28" rx="5" fill="#000000" />
      <text x="65" y="19" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle" letter-spacing="1">SPRINT 3</text>
      
      <rect x="140" y="0" width="100" height="28" rx="5" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2" />
      <text x="190" y="19" fill="#0f172a" font-size="13" font-weight="800" text-anchor="middle">Figure 4.3</text>
      
      <text x="255" y="20" fill="#000000" font-size="17" font-weight="800">Sprint 3: Physical Circulation, Overdue Control &amp; System Health</text>
      <text x="255" y="38" fill="#555555" font-size="11.5" font-weight="500">UML Use Case Specification Featuring Clean Direct Terms Across Four (4) Institutional Roles</text>
    </g>

    <!-- System Boundary Box -->
    <rect x="220" y="78" width="980" height="875" rx="8" fill="#ffffff" stroke="#000000" stroke-width="2.2" />
    
    <!-- Header Banner -->
    <rect x="235" y="90" width="950" height="34" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.2" />
    <text x="250" y="112" font-size="14" font-weight="900" fill="#000000" letter-spacing="0.5">LibraLink System — SPRINT 3: PHYSICAL CIRCULATION &amp; SYSTEM HEALTH</text>
    <text x="1170" y="112" font-size="11" font-weight="700" fill="#475569" text-anchor="end">4 User Roles + Simple Terms</text>

    <!-- 4 ACTORS -->
    ${renderActor(110, 340, 'Student', 'Role 4 (Visiting Borrower)')}
    ${renderActor(110, 750, 'Librarian', 'Role 3 (Desk Staff)')}
    ${renderActor(1310, 340, 'Admin-Librarian', 'Head Librarian')}
    ${renderActor(1310, 750, 'Super-Admin', 'Role 1 (System Admin)')}

    <!-- CENTRAL LOGIN USE CASE -->
    ${renderOval(710, 165, 115, 30, 'Login', '', true)}

    <!-- USE CASES (OVALS) -->
    <!-- Student (Sprint 3) -->
    ${renderOval(400, 240, 115, 25, 'Present QR Pass')}
    ${renderOval(400, 310, 110, 25, 'Claim Book')}
    ${renderOval(400, 380, 110, 25, 'Return Book')}
    ${renderOval(400, 450, 120, 25, 'View Overdue Days')}
    ${renderOval(400, 520, 115, 25, 'Borrow History')}

    <!-- Central Sub-processes -->
    ${renderOval(710, 420, 120, 27, 'Save Audit Log', '', true)}
    ${renderOval(710, 650, 120, 27, 'Verify QR Code', '', false, true)}
    ${renderOval(710, 790, 120, 27, 'Compute Fines', '', false, true)}

    <!-- Librarian (Sprint 3) -->
    ${renderOval(400, 650, 115, 25, 'Scan QR Pass')}
    ${renderOval(400, 720, 110, 25, 'Release Book')}
    ${renderOval(400, 790, 115, 25, 'Receive Return')}
    ${renderOval(400, 860, 115, 25, 'Manage Overdues')}
    ${renderOval(400, 925, 120, 25, 'Permission Letter')}

    <!-- Admin-Librarian (Sprint 3) -->
    ${renderOval(1020, 240, 115, 25, 'Borrowing Policies')}
    ${renderOval(1020, 310, 115, 25, 'Manage Fines')}
    ${renderOval(1020, 380, 115, 25, 'User Accounts')}
    ${renderOval(1020, 450, 115, 25, 'Lost Book Fees')}
    ${renderOval(1020, 520, 120, 25, 'Circulation Reports')}

    <!-- Super-Admin (Sprint 3) -->
    ${renderOval(1020, 680, 115, 25, 'Audit Trails')}
    ${renderOval(1020, 750, 115, 25, 'Lending Analytics')}
    ${renderOval(1020, 820, 115, 25, 'Database Backups')}
    ${renderOval(1020, 885, 115, 25, 'System Health')}

    <!-- DIRECT SOLID LOGIN LINES -->
    <line x1="145" y1="300" x2="600" y2="165" stroke="#000000" stroke-width="1.8" />
    <line x1="145" y1="715" x2="610" y2="178" stroke="#000000" stroke-width="1.8" />
    <line x1="1275" y1="300" x2="820" y2="165" stroke="#000000" stroke-width="1.8" />
    <line x1="1275" y1="715" x2="810" y2="178" stroke="#000000" stroke-width="1.8" />

    <!-- CLEAN ASSOCIATION LINES: STUDENT -->
    <line x1="135" y1="325" x2="285" y2="240" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="335" x2="290" y2="310" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="350" x2="290" y2="380" stroke="#000000" stroke-width="1.3" />
    <line x1="140" y1="365" x2="280" y2="450" stroke="#000000" stroke-width="1.3" />
    <line x1="135" y1="380" x2="285" y2="520" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: LIBRARIAN -->
    <line x1="135" y1="730" x2="285" y2="650" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="745" x2="290" y2="720" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="760" x2="285" y2="790" stroke="#000000" stroke-width="1.3" />
    <line x1="140" y1="775" x2="285" y2="860" stroke="#000000" stroke-width="1.3" />
    <line x1="135" y1="790" x2="280" y2="925" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: ADMIN-LIBRARIAN -->
    <line x1="1285" y1="325" x2="1135" y2="240" stroke="#000000" stroke-width="1.3" />
    <line x1="1275" y1="335" x2="1135" y2="310" stroke="#000000" stroke-width="1.3" />
    <line x1="1275" y1="350" x2="1135" y2="380" stroke="#000000" stroke-width="1.3" />
    <line x1="1285" y1="365" x2="1135" y2="450" stroke="#000000" stroke-width="1.3" />
    <line x1="1285" y1="380" x2="1140" y2="520" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: SUPER-ADMIN -->
    <line x1="1285" y1="735" x2="1135" y2="680" stroke="#000000" stroke-width="1.3" />
    <line x1="1275" y1="750" x2="1135" y2="750" stroke="#000000" stroke-width="1.3" />
    <line x1="1285" y1="765" x2="1135" y2="820" stroke="#000000" stroke-width="1.3" />
    <line x1="1285" y1="780" x2="1135" y2="885" stroke="#000000" stroke-width="1.3" />

    <!-- UML RELATIONSHIPS -->
    ${renderRelation(515, 650, 590, 650, 'include')}
    ${renderRelation(515, 860, 590, 790, 'include')}
    ${renderRelation(515, 790, 610, 440, 'include')}
  </svg>
  `;
}

module.exports = {
  getSprint1Svg,
  getSprint2Svg,
  getSprint3Svg
};
