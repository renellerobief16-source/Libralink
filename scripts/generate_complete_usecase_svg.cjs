const fs = require('fs');

function getCompleteUseCaseSvg() {
  const width = 1600;
  const height = 1200;

  // Actor icon helper
  function renderActor(x, y, name, roleCode) {
    return `
      <g transform="translate(${x}, ${y})">
        <!-- Head -->
        <circle cx="0" cy="-28" r="14" fill="#ffffff" stroke="#000000" stroke-width="2" />
        <!-- Body -->
        <line x1="0" y1="-14" x2="0" y2="18" stroke="#000000" stroke-width="2" />
        <!-- Arms -->
        <line x1="-22" y1="-4" x2="22" y2="-4" stroke="#000000" stroke-width="2" />
        <!-- Left Leg -->
        <line x1="0" y1="18" x2="-18" y2="46" stroke="#000000" stroke-width="2" />
        <!-- Right Leg -->
        <line x1="0" y1="18" x2="18" y2="46" stroke="#000000" stroke-width="2" />
        <!-- Actor Name -->
        <text x="0" y="66" font-size="14" font-weight="800" fill="#000000" text-anchor="middle">${name}</text>
        <rect x="-50" y="73" width="100" height="18" rx="3" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
        <text x="0" y="86" font-size="9.5" font-weight="700" fill="#475569" text-anchor="middle">${roleCode}</text>
      </g>
    `;
  }

  // Use case oval helper
  function renderUseCase(x, y, rx, ry, line1, line2 = '', isHighlighted = false, isDashed = false) {
    const strokeWidth = isHighlighted ? 2.4 : 1.5;
    const strokeDash = isDashed ? 'stroke-dasharray="4,3"' : '';
    const fill = isHighlighted ? '#f8fafc' : (isDashed ? '#fbfcfe' : '#ffffff');
    return `
      <g transform="translate(${x}, ${y})">
        <ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="${fill}" stroke="#000000" stroke-width="${strokeWidth}" ${strokeDash} />
        ${line2 ? `
          <text x="0" y="-3" font-size="11.5" font-weight="${isHighlighted ? '800' : '600'}" fill="#000000" text-anchor="middle">${line1}</text>
          <text x="0" y="13" font-size="11.5" font-weight="${isHighlighted ? '800' : '600'}" fill="#000000" text-anchor="middle">${line2}</text>
        ` : `
          <text x="0" y="4" font-size="12" font-weight="${isHighlighted ? '800' : '600'}" fill="#000000" text-anchor="middle">${line1}</text>
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

  return `
  <svg id="svg-complete-usecase" viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
    <defs>
      <marker id="uc-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5" fill="none" stroke="#000000" stroke-width="1.6" />
      </marker>
    </defs>

    <!-- Header Block -->
    <g transform="translate(60, 24)">
      <rect x="0" y="0" width="120" height="28" rx="4" fill="#000000" />
      <text x="60" y="19" fill="#ffffff" font-size="13" font-weight="800" text-anchor="middle" letter-spacing="0.5">Figure 4.10</text>
      
      <text x="135" y="20" fill="#000000" font-size="18" font-weight="800">Complete Detailed LibraLink Actor-to-Use-Case Interaction Diagram</text>
      <text x="135" y="38" fill="#555555" font-size="12" font-weight="500">Comprehensive UML 2.5 Specification Featuring Clean Direct Terms Across Four (4) Institutional Roles</text>
    </g>

    <!-- SYSTEM BOUNDARY BOX -->
    <rect x="220" y="78" width="1160" height="1095" rx="8" fill="#ffffff" stroke="#000000" stroke-width="2.2" />
    
    <!-- System Boundary Top Header -->
    <rect x="235" y="90" width="1130" height="34" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.2" />
    <text x="250" y="112" font-size="15" font-weight="900" fill="#000000" letter-spacing="0.5">LibraLink System — Complete Core &amp; Sub-Process Use Case Model</text>
    <text x="1350" y="112" font-size="11" font-weight="700" fill="#475569" text-anchor="end">4 User Roles + Simple Terms</text>

    <!-- THE FOUR (4) ACTORS -->
    ${renderActor(110, 360, 'Student', 'Role 4 (Borrower)')}
    ${renderActor(110, 890, 'Librarian', 'Role 3 (Desk Staff)')}
    ${renderActor(1490, 360, 'Admin-Librarian', 'Head Librarian')}
    ${renderActor(1490, 890, 'Super-Admin', 'Role 1 (System Admin)')}

    <!-- CENTRAL LOGIN USE CASE -->
    ${renderUseCase(800, 165, 115, 30, 'Login', '', true)}

    <!-- SECTION 1: STUDENT BASE USE CASES (LEFT TOP) -->
    ${renderUseCase(410, 230, 115, 25, 'User Onboarding')}
    ${renderUseCase(410, 295, 110, 25, 'Search Books')}
    ${renderUseCase(410, 360, 115, 25, 'Filter Books')}
    ${renderUseCase(410, 425, 115, 25, 'Check Availability')}
    ${renderUseCase(410, 490, 115, 25, 'Save Favorites')}
    ${renderUseCase(410, 555, 115, 25, 'Borrow Requests')}
    ${renderUseCase(410, 620, 115, 25, 'Borrow History')}

    <!-- SECTION 2: LIBRARIAN BASE USE CASES (LEFT BOTTOM) -->
    ${renderUseCase(410, 725, 115, 25, 'Browse Books')}
    ${renderUseCase(410, 790, 110, 25, 'Add Book')}
    ${renderUseCase(410, 855, 115, 25, 'Manage Copies')}
    ${renderUseCase(410, 920, 115, 25, 'Approve Request')}
    ${renderUseCase(410, 985, 115, 25, 'Release Book')}
    ${renderUseCase(410, 1050, 115, 25, 'Manage Overdues')}
    ${renderUseCase(410, 1115, 115, 25, 'Permission Letter')}

    <!-- SECTION 3: ADMIN-LIBRARIAN BASE USE CASES (RIGHT TOP) -->
    ${renderUseCase(1190, 230, 110, 25, 'Import Books')}
    ${renderUseCase(1190, 295, 115, 25, 'Book Categories')}
    ${renderUseCase(1190, 360, 115, 25, 'Borrowing Policies')}
    ${renderUseCase(1190, 425, 115, 25, 'Manage Fines')}
    ${renderUseCase(1190, 490, 115, 25, 'User Accounts')}
    ${renderUseCase(1190, 555, 115, 25, 'Library Settings')}
    ${renderUseCase(1190, 620, 120, 25, 'Circulation Reports')}

    <!-- SECTION 4: SUPER-ADMIN BASE USE CASES (RIGHT BOTTOM) -->
    ${renderUseCase(1190, 750, 115, 25, 'Manage Schools')}
    ${renderUseCase(1190, 825, 115, 25, 'School Profiles')}
    ${renderUseCase(1190, 900, 115, 25, 'Lending Analytics')}
    ${renderUseCase(1190, 975, 115, 25, 'Audit Trails')}
    ${renderUseCase(1190, 1050, 115, 25, 'Database Backups')}

    <!-- CENTRAL WORKFLOW / SUB-PROCESS OVALS -->
    ${renderUseCase(800, 295, 120, 27, 'Partner Suggestion', '', false, true)}
    ${renderUseCase(800, 555, 120, 27, 'Generate QR Pass', '', false, true)}
    ${renderUseCase(800, 230, 120, 27, 'Verify CSV File', '', false, true)}
    ${renderUseCase(800, 920, 120, 27, 'Check Eligibility', '', false, true)}
    ${renderUseCase(800, 985, 120, 27, 'Verify QR Code', '', false, true)}
    ${renderUseCase(800, 1050, 120, 27, 'Compute Fines', '', false, true)}
    ${renderUseCase(800, 750, 120, 27, 'Save Audit Log', '', true)}

    <!-- SOLID DIRECT LOGIN LINES FROM ALL 4 ACTORS -->
    <line x1="145" y1="320" x2="685" y2="165" stroke="#000000" stroke-width="1.8" />
    <line x1="145" y1="850" x2="695" y2="178" stroke="#000000" stroke-width="1.8" />
    <line x1="1455" y1="320" x2="915" y2="165" stroke="#000000" stroke-width="1.8" />
    <line x1="1455" y1="850" x2="905" y2="178" stroke="#000000" stroke-width="1.8" />

    <!-- CLEAN ASSOCIATION LINES: STUDENT -->
    <line x1="135" y1="345" x2="295" y2="230" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="355" x2="300" y2="295" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="365" x2="295" y2="360" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="375" x2="295" y2="425" stroke="#000000" stroke-width="1.3" />
    <line x1="140" y1="385" x2="295" y2="490" stroke="#000000" stroke-width="1.3" />
    <line x1="135" y1="395" x2="295" y2="555" stroke="#000000" stroke-width="1.3" />
    <line x1="130" y1="405" x2="295" y2="620" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: LIBRARIAN -->
    <line x1="130" y1="850" x2="295" y2="725" stroke="#000000" stroke-width="1.3" />
    <line x1="135" y1="865" x2="300" y2="790" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="880" x2="295" y2="855" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="895" x2="295" y2="920" stroke="#000000" stroke-width="1.3" />
    <line x1="145" y1="910" x2="295" y2="985" stroke="#000000" stroke-width="1.3" />
    <line x1="135" y1="925" x2="295" y2="1050" stroke="#000000" stroke-width="1.3" />
    <line x1="130" y1="940" x2="295" y2="1115" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: ADMIN-LIBRARIAN -->
    <line x1="1465" y1="345" x2="1300" y2="230" stroke="#000000" stroke-width="1.3" />
    <line x1="1455" y1="355" x2="1305" y2="295" stroke="#000000" stroke-width="1.3" />
    <line x1="1455" y1="365" x2="1305" y2="360" stroke="#000000" stroke-width="1.3" />
    <line x1="1455" y1="375" x2="1305" y2="425" stroke="#000000" stroke-width="1.3" />
    <line x1="1460" y1="385" x2="1305" y2="490" stroke="#000000" stroke-width="1.3" />
    <line x1="1465" y1="395" x2="1305" y2="555" stroke="#000000" stroke-width="1.3" />
    <line x1="1470" y1="405" x2="1310" y2="620" stroke="#000000" stroke-width="1.3" />

    <!-- CLEAN ASSOCIATION LINES: SUPER-ADMIN -->
    <line x1="1470" y1="860" x2="1305" y2="750" stroke="#000000" stroke-width="1.3" />
    <line x1="1455" y1="875" x2="1305" y2="825" stroke="#000000" stroke-width="1.3" />
    <line x1="1455" y1="890" x2="1305" y2="900" stroke="#000000" stroke-width="1.3" />
    <line x1="1455" y1="905" x2="1305" y2="975" stroke="#000000" stroke-width="1.3" />
    <line x1="1470" y1="920" x2="1305" y2="1050" stroke="#000000" stroke-width="1.3" />

    <!-- UML RELATIONSHIPS -->
    ${renderRelation(520, 295, 680, 295, 'extend')}
    ${renderRelation(525, 555, 680, 555, 'include')}
    ${renderRelation(1080, 230, 920, 230, 'include')}
    ${renderRelation(525, 920, 680, 920, 'include')}
    ${renderRelation(525, 985, 680, 985, 'include')}
    ${renderRelation(525, 1050, 680, 1050, 'include')}
    ${renderRelation(525, 985, 680, 750, 'include')}
  </svg>
  `;
}

module.exports = { getCompleteUseCaseSvg };
