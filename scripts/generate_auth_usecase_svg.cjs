const fs = require('fs');

function renderActor(x, y, name, roleCode) {
  return `
    <g transform="translate(${x}, ${y})">
      <circle cx="0" cy="-26" r="13" fill="#ffffff" stroke="#000000" stroke-width="1.8" />
      <line x1="0" y1="-13" x2="0" y2="16" stroke="#000000" stroke-width="1.8" />
      <line x1="-20" y1="-3" x2="20" y2="-3" stroke="#000000" stroke-width="1.8" />
      <line x1="0" y1="16" x2="-16" y2="42" stroke="#000000" stroke-width="1.8" />
      <line x1="0" y1="16" x2="16" y2="42" stroke="#000000" stroke-width="1.8" />
      <text x="0" y="60" font-size="13" font-weight="800" fill="#000000" text-anchor="middle">${name}</text>
      <rect x="-42" y="67" width="84" height="17" rx="3" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
      <text x="0" y="79" font-size="9.5" font-weight="700" fill="#475569" text-anchor="middle">${roleCode}</text>
    </g>
  `;
}

function renderOval(x, y, rx, ry, line1, line2 = '', isIncluded = false) {
  return `
    <g transform="translate(${x}, ${y})">
      <ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
      ${line2 ? `
        <text x="0" y="-3" font-size="11.5" font-weight="600" fill="#000000" text-anchor="middle">${line1}</text>
        <text x="0" y="13" font-size="11.5" font-weight="600" fill="#000000" text-anchor="middle">${line2}</text>
      ` : `
        <text x="0" y="4" font-size="12" font-weight="600" fill="#000000" text-anchor="middle">${line1}</text>
      `}
    </g>
  `;
}

function renderInclude(x1, y1, x2, y2, labelX, labelY, label = '<<include>>') {
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000000" stroke-width="1.3" stroke-dasharray="4,3" marker-end="url(#auth-arrow)" />
    <rect x="${labelX - 32}" y="${labelY - 8}" width="64" height="15" rx="2" fill="#ffffff" />
    <text x="${labelX}" y="${labelY + 3}" font-size="9" font-weight="700" fill="#000000" text-anchor="middle">${label}</text>
  `;
}

function getAuthUseCaseSvg() {
  const width = 1380;
  const height = 980;

  return `
  <svg id="svg-auth" viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
    <defs>
      <marker id="auth-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5" fill="none" stroke="#000000" stroke-width="1.6" />
      </marker>
    </defs>

    <!-- Header Block -->
    <g transform="translate(60, 24)">
      <rect x="0" y="0" width="105" height="24" rx="4" fill="#000000" />
      <text x="52" y="17" fill="#ffffff" font-size="12.5" font-weight="700" text-anchor="middle">Figure 4.0</text>
      <text x="120" y="18" fill="#000000" font-size="17" font-weight="800">User Authentication &amp; Role-Based Access Control (RBAC) Use Case Diagram</text>
      <text x="120" y="36" fill="#555555" font-size="11.5" font-weight="500">Comprehensive UML Use Case Specification for System Access Across All Four (4) User Roles</text>
    </g>

    <!-- System Boundary Box -->
    <rect x="220" y="75" width="940" height="870" rx="8" fill="#ffffff" stroke="#000000" stroke-width="2.2" />
    <text x="240" y="105" font-size="15" font-weight="800" fill="#000000">LibraLink Authentication &amp; Access Control Subsystem</text>
    <line x1="240" y1="112" x2="680" y2="112" stroke="#000000" stroke-width="1.3" />

    <!-- 4 ACTORS -->
    ${renderActor(110, 260, 'Students', 'Role 4 (Borrower)')}
    ${renderActor(110, 680, 'Librarian', 'Role 3 (Desk Staff)')}
    ${renderActor(1270, 260, 'Admin-Librarian', 'Role 2 (Head Admin)')}
    ${renderActor(1270, 680, 'Super Admin', 'Role 1 (System Admin)')}

    <!-- ======================================================== -->
    <!-- USE CASES (OVALS)                                        -->
    <!-- ======================================================== -->

    <!-- Top Common: Select Campus Affiliation -->
    ${renderOval(690, 140, 130, 28, 'Select Campus Affiliation', '(GNC / Santa Rita College)')}

    <!-- Student Registration & OTP Verification -->
    ${renderOval(390, 210, 120, 28, 'Register Account', '(Student Self-Registration)')}
    ${renderOval(390, 290, 120, 28, 'Verify Email Address', 'via OTP Code (6 Digits)')}

    <!-- Central Login Use Case (Connected to All 4 Actors) -->
    ${renderOval(690, 310, 135, 32, 'Login with Institutional', 'Email & Password')}

    <!-- Password Recovery & Reset Flow -->
    ${renderOval(390, 420, 120, 28, 'Request Password Reset', '(Forgot Password)')}
    ${renderOval(390, 500, 120, 28, 'Verify Reset OTP Code', '& Set New Password')}

    <!-- Central Security Sub-processes (<<include>>) -->
    ${renderOval(690, 450, 130, 28, 'Verify Password Hash', '(Bcrypt Salt Validation)', true)}
    ${renderOval(690, 530, 130, 28, 'Check Account Status', '(Active / Cleared / Inactive)', true)}
    ${renderOval(690, 610, 130, 28, 'Generate JWT Session Token', '& Institutional Claims', true)}

    <!-- Role-Based Redirection Core -->
    ${renderOval(690, 710, 135, 30, 'Enforce Role-Based Access', 'Routing & Redirection (RBAC)')}

    <!-- 4 Role Destination Dashboards -->
    ${renderOval(390, 660, 115, 26, 'Redirect to Student', 'Web Portal (Role 4)')}
    ${renderOval(390, 760, 115, 26, 'Redirect to Librarian', 'Desk Inbox (Role 3)')}
    ${renderOval(990, 660, 120, 26, 'Redirect to Admin-Librarian', 'Dashboard (Role 2)')}
    ${renderOval(990, 760, 120, 26, 'Redirect to Super Admin', 'Console (Role 1)')}

    <!-- Common Logout at Bottom -->
    ${renderOval(690, 870, 135, 30, 'Logout & Invalidate', 'Active Session Token')}

    <!-- ======================================================== -->
    <!-- ASSOCIATION LINES (ACTORS TO USE CASES)                  -->
    <!-- ======================================================== -->

    <!-- STUDENTS (x=110, y=260) -->
    <line x1="145" y1="230" x2="560" y2="140" stroke="#000000" stroke-width="1.3" />
    <line x1="150" y1="245" x2="270" y2="210" stroke="#000000" stroke-width="1.3" />
    <line x1="150" y1="260" x2="270" y2="290" stroke="#000000" stroke-width="1.3" />
    <line x1="155" y1="275" x2="555" y2="310" stroke="#000000" stroke-width="1.6" />
    <line x1="145" y1="290" x2="270" y2="420" stroke="#000000" stroke-width="1.3" />
    <line x1="135" y1="310" x2="555" y2="870" stroke="#000000" stroke-width="1.3" />

    <!-- LIBRARIAN (x=110, y=680) -->
    <line x1="140" y1="650" x2="560" y2="150" stroke="#000000" stroke-width="1.3" />
    <line x1="150" y1="665" x2="555" y2="320" stroke="#000000" stroke-width="1.6" />
    <line x1="145" y1="680" x2="270" y2="430" stroke="#000000" stroke-width="1.3" />
    <line x1="140" y1="700" x2="555" y2="875" stroke="#000000" stroke-width="1.3" />

    <!-- ADMIN-LIBRARIAN (x=1270, y=260) -->
    <line x1="1235" y1="230" x2="820" y2="140" stroke="#000000" stroke-width="1.3" />
    <line x1="1230" y1="250" x2="825" y2="310" stroke="#000000" stroke-width="1.6" />
    <line x1="1235" y1="270" x2="825" y2="420" stroke="#000000" stroke-width="1.3" />
    <line x1="1245" y1="290" x2="825" y2="870" stroke="#000000" stroke-width="1.3" />

    <!-- SUPER ADMIN (x=1270, y=680) -->
    <line x1="1240" y1="650" x2="820" y2="150" stroke="#000000" stroke-width="1.3" />
    <line x1="1230" y1="665" x2="825" y2="320" stroke="#000000" stroke-width="1.6" />
    <line x1="1235" y1="680" x2="825" y2="430" stroke="#000000" stroke-width="1.3" />
    <line x1="1240" y1="700" x2="825" y2="875" stroke="#000000" stroke-width="1.3" />

    <!-- ======================================================== -->
    <!-- <<INCLUDE>> AND <<EXTEND>> ARROWS                        -->
    <!-- ======================================================== -->
    <!-- Register -> Verify OTP -->
    ${renderInclude(390, 238, 390, 262, 390, 250)}

    <!-- Forgot Password -> Verify OTP -->
    ${renderInclude(390, 448, 390, 472, 390, 460)}

    <!-- Forgot Password extends Login -->
    ${renderInclude(510, 420, 600, 340, 560, 375, '<<extend>>')}

    <!-- Login includes Password Hash -->
    ${renderInclude(690, 342, 690, 422, 690, 385)}

    <!-- Login includes Check Status -->
    ${renderInclude(690, 478, 690, 502, 690, 490)}

    <!-- Login includes JWT Token -->
    ${renderInclude(690, 558, 690, 582, 690, 570)}

    <!-- JWT Token includes RBAC Routing -->
    ${renderInclude(690, 638, 690, 680, 690, 660)}

    <!-- RBAC Routing to 4 Dashboards -->
    <!-- To Student Portal -->
    ${renderInclude(560, 700, 505, 670, 530, 680)}
    <!-- To Librarian Desk -->
    ${renderInclude(560, 720, 505, 750, 530, 740)}
    <!-- To Admin-Librarian Dashboard -->
    ${renderInclude(820, 700, 870, 670, 850, 680)}
    <!-- To Super Admin Panel -->
    ${renderInclude(820, 720, 870, 750, 850, 740)}

    <!-- Logout invalidates JWT Session -->
    ${renderInclude(690, 840, 690, 740, 690, 790)}
  </svg>
  `;
}

module.exports = { getAuthUseCaseSvg };
