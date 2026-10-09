const fs = require('fs');

function generateERDSvg() {
  const width = 1420;
  const height = 980;

  // Tables definitions
  // Column 1: Roles (y=100), Schools (y=225), Users (y=475), Verification Codes (y=770)
  // Column 2: Categories (y=100), Authors (y=245), Books (y=375), Book Copies (y=675)
  // Column 3: Borrow Requests (y=160), Borrow Request Items (y=435), Borrow Transactions (y=640)
  // Column 4: Fines (y=640)

  const tables = [
    // --- COL 1: Multi-Tenancy & Users (Cyan) ---
    {
      id: 'roles', x: 50, y: 95, w: 230, h: 90, headerBg: '#0284c7', title: 'roles',
      fields: [
        { name: 'role_id', key: 'PK', type: 'integer' },
        { name: 'role_name', key: '', type: 'varchar(50)' },
      ]
    },
    {
      id: 'schools', x: 50, y: 220, w: 230, h: 215, headerBg: '#0284c7', title: 'schools',
      fields: [
        { name: 'school_id', key: 'PK', type: 'integer' },
        { name: 'school_name', key: '', type: 'varchar(255)' },
        { name: 'school_code', key: '', type: 'varchar(50)' },
        { name: 'address', key: '', type: 'text' },
        { name: 'contact_number', key: '', type: 'varchar(50)' },
        { name: 'email', key: '', type: 'varchar(255)' },
        { name: 'status', key: '', type: 'varchar(20)' },
        { name: 'created_at', key: '', type: 'timestamp' }
      ]
    },
    {
      id: 'users', x: 50, y: 470, w: 230, h: 255, headerBg: '#0284c7', title: 'users',
      fields: [
        { name: 'user_id', key: 'PK', type: 'integer' },
        { name: 'school_id', key: 'FK', type: 'integer' },
        { name: 'role_id', key: 'FK', type: 'integer' },
        { name: 'student_number', key: '', type: 'varchar(50)' },
        { name: 'firstname', key: '', type: 'varchar(100)' },
        { name: 'lastname', key: '', type: 'varchar(100)' },
        { name: 'email', key: '', type: 'varchar(255)' },
        { name: 'password', key: '', type: 'varchar(255)' },
        { name: 'status', key: '', type: 'varchar(20)' },
        { name: 'created_at', key: '', type: 'timestamp' }
      ]
    },
    {
      id: 'verification_codes', x: 50, y: 760, w: 230, h: 165, headerBg: '#0284c7', title: 'verification_codes',
      fields: [
        { name: 'id', key: 'PK', type: 'integer' },
        { name: 'user_id', key: 'FK', type: 'integer' },
        { name: 'email', key: '', type: 'varchar(255)' },
        { name: 'code', key: '', type: 'varchar(10)' },
        { name: 'expires_at', key: '', type: 'timestamp' },
        { name: 'created_at', key: '', type: 'timestamp' }
      ]
    },

    // --- COL 2: Catalog & Inventory (Green) ---
    {
      id: 'categories', x: 390, y: 95, w: 230, h: 115, headerBg: '#059669', title: 'categories',
      fields: [
        { name: 'category_id', key: 'PK', type: 'integer' },
        { name: 'category_name', key: '', type: 'varchar(100)' },
        { name: 'description', key: '', type: 'text' },
        { name: 'created_at', key: '', type: 'timestamp' }
      ]
    },
    {
      id: 'authors', x: 390, y: 245, w: 230, h: 90, headerBg: '#059669', title: 'authors',
      fields: [
        { name: 'author_id', key: 'PK', type: 'integer' },
        { name: 'author_name', key: '', type: 'varchar(255)' },
      ]
    },
    {
      id: 'books', x: 390, y: 370, w: 230, h: 255, headerBg: '#059669', title: 'books',
      fields: [
        { name: 'book_id', key: 'PK', type: 'integer' },
        { name: 'school_id', key: 'FK', type: 'integer' },
        { name: 'category_id', key: 'FK', type: 'integer' },
        { name: 'title', key: '', type: 'varchar(255)' },
        { name: 'isbn', key: '', type: 'varchar(50)' },
        { name: 'call_number', key: '', type: 'varchar(100)' },
        { name: 'shelf_location', key: '', type: 'varchar(100)' },
        { name: 'copies_available', key: '', type: 'integer' },
        { name: 'status', key: '', type: 'varchar(20)' },
        { name: 'created_at', key: '', type: 'timestamp' }
      ]
    },
    {
      id: 'book_copies', x: 390, y: 665, w: 230, h: 185, headerBg: '#059669', title: 'book_copies',
      fields: [
        { name: 'copy_id', key: 'PK', type: 'integer' },
        { name: 'book_id', key: 'FK', type: 'integer' },
        { name: 'accession_number', key: '', type: 'varchar(100)' },
        { name: 'barcode', key: '', type: 'varchar(100)' },
        { name: 'condition', key: '', type: 'varchar(50)' },
        { name: 'status', key: '', type: 'varchar(20)' },
        { name: 'created_at', key: '', type: 'timestamp' }
      ]
    },

    // --- COL 3: Circulation & Requests (Orange) ---
    {
      id: 'borrow_requests', x: 730, y: 150, w: 240, h: 235, headerBg: '#d97706', title: 'borrow_requests',
      fields: [
        { name: 'request_id', key: 'PK', type: 'integer' },
        { name: 'student_id', key: 'FK', type: 'integer' },
        { name: 'home_school_id', key: 'FK', type: 'integer' },
        { name: 'target_school_id', key: 'FK', type: 'integer' },
        { name: 'access_token', key: '', type: 'varchar(255)' },
        { name: 'qr_code_hash', key: '', type: 'text' },
        { name: 'status', key: '', type: 'varchar(50)' },
        { name: 'expires_at', key: '', type: 'timestamp' },
        { name: 'created_at', key: '', type: 'timestamp' }
      ]
    },
    {
      id: 'borrow_request_items', x: 730, y: 425, w: 240, h: 165, headerBg: '#d97706', title: 'borrow_request_items',
      fields: [
        { name: 'item_id', key: 'PK', type: 'integer' },
        { name: 'request_id', key: 'FK', type: 'integer' },
        { name: 'book_id', key: 'FK', type: 'integer' },
        { name: 'copy_id', key: 'FK', type: 'integer' },
        { name: 'status', key: '', type: 'varchar(50)' },
        { name: 'created_at', key: '', type: 'timestamp' }
      ]
    },
    {
      id: 'borrow_transactions', x: 730, y: 630, w: 240, h: 235, headerBg: '#d97706', title: 'borrow_transactions',
      fields: [
        { name: 'borrow_id', key: 'PK', type: 'integer' },
        { name: 'request_id', key: 'FK', type: 'integer' },
        { name: 'copy_id', key: 'FK', type: 'integer' },
        { name: 'user_id', key: 'FK', type: 'integer' },
        { name: 'librarian_id', key: 'FK', type: 'integer' },
        { name: 'borrow_date', key: '', type: 'timestamp' },
        { name: 'due_date', key: '', type: 'timestamp' },
        { name: 'return_date', key: '', type: 'timestamp' },
        { name: 'status', key: '', type: 'varchar(50)' }
      ]
    },

    // --- COL 4: Finance (Purple) ---
    {
      id: 'fines', x: 1080, y: 630, w: 230, h: 215, headerBg: '#7c3aed', title: 'fines',
      fields: [
        { name: 'fine_id', key: 'PK', type: 'integer' },
        { name: 'borrow_id', key: 'FK', type: 'integer' },
        { name: 'user_id', key: 'FK', type: 'integer' },
        { name: 'amount', key: '', type: 'decimal(10,2)' },
        { name: 'overdue_days', key: '', type: 'integer' },
        { name: 'status', key: '', type: 'varchar(20)' },
        { name: 'paid_date', key: '', type: 'timestamp' },
        { name: 'created_at', key: '', type: 'timestamp' }
      ]
    }
  ];

  let svg = `
        <svg id="svg-erd" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:Arial, Helvetica, sans-serif;">
          <defs>
            <!-- Cardinality Crow Foot Marker -->
            <marker id="erd-crow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
              <path d="M 1 2 L 10 6 L 1 10 M 1 6 L 10 6" fill="none" stroke="#334155" stroke-width="1.4"/>
            </marker>
            <!-- Exactly One Marker (two perpendicular bars) -->
            <marker id="erd-one" viewBox="0 0 10 12" refX="4" refY="6" markerWidth="7" markerHeight="8" orient="auto">
              <line x1="2" y1="1" x2="2" y2="11" stroke="#334155" stroke-width="1.6"/>
              <line x1="6" y1="1" x2="6" y2="11" stroke="#334155" stroke-width="1.6"/>
            </marker>
            <filter id="erd-shadow" x="-3%" y="-3%" width="106%" height="108%" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="1.5"/>
              <feComponentTransfer><feFuncA type="linear" slope="0.08"/></feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- Top Caption in Academic Document -->
          <text x="30" y="35" font-weight="bold" font-size="16" fill="#000000">Figure 4.13</text>
          <text x="30" y="55" font-style="italic" font-size="14" fill="#333333">Entity-Relationship Diagram (ERD) of LibraLink Multi-Campus Library System</text>

          <!-- ============================================== -->
          <!-- RELATIONSHIP CONNECTOR LINES (CROW'S FOOT)     -->
          <!-- ============================================== -->
          <g id="erd-relationships" stroke="#475569" stroke-width="1.3" fill="none">
            <!-- 1. roles (1) -> users (M) -->
            <path d="M 165 185 L 165 470" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 2. schools (1) -> users (M) -->
            <path d="M 120 435 L 120 470" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 3. users (1) -> verification_codes (M) -->
            <path d="M 165 725 L 165 760" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 4. schools (1) -> books (M) -->
            <path d="M 280 260 L 335 260 L 335 410 L 390 410" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 5. categories (1) -> books (M) -->
            <path d="M 505 210 L 505 370" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 6. books (1) -> book_copies (M) -->
            <path d="M 505 625 L 505 665" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 7. users (1) -> borrow_requests (M) (student_id) -->
            <path d="M 280 500 L 680 500 L 680 190 L 730 190" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 8. borrow_requests (1) -> borrow_request_items (M) -->
            <path d="M 850 385 L 850 425" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 9. books (1) -> borrow_request_items (M) -->
            <path d="M 620 450 L 730 450" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 10. book_copies (1) -> borrow_request_items (M) -->
            <path d="M 620 685 L 675 685 L 675 510 L 730 510" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 11. borrow_requests (1) -> borrow_transactions (M) -->
            <path d="M 970 210 L 1020 210 L 1020 660 L 970 660" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 12. borrow_transactions (1) -> fines (M) -->
            <path d="M 970 700 L 1080 700" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>

            <!-- 13. users (1) -> fines (M) (user_id) -->
            <path d="M 280 710 L 335 710 L 335 930 L 1195 930 L 1195 845" marker-start="url(#erd-one)" marker-end="url(#erd-crow)"/>
          </g>

          <!-- ============================================== -->
          <!-- ENTITY TABLES                                  -->
          <!-- ============================================== -->
  `;

  for (const t of tables) {
    svg += `
          <!-- Table: ${t.title} -->
          <g id="table-${t.id}" filter="url(#erd-shadow)">
            <!-- Outer Box -->
            <rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="6" ry="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.3"/>
            <!-- Header Bar -->
            <path d="M ${t.x} ${t.y + 6} Q ${t.x} ${t.y} ${t.x + 6} ${t.y} L ${t.x + t.w - 6} ${t.y} Q ${t.x + t.w} ${t.y} ${t.x + t.w} ${t.y + 6} L ${t.x + t.w} ${t.y + 26} L ${t.x} ${t.y + 26} Z" fill="${t.headerBg}"/>
            <text x="${t.x + t.w / 2}" y="${t.y + 18}" text-anchor="middle" font-weight="bold" font-size="12.5" fill="#ffffff">${t.title}</text>
            <line x1="${t.x}" y1="${t.y + 26}" x2="${t.x + t.w}" y2="${t.y + 26}" stroke="#94a3b8" stroke-width="1"/>
    `;

    let rowY = t.y + 44;
    for (const f of t.fields) {
      const isPk = f.key === 'PK';
      const isFk = f.key === 'FK';
      const nameColor = isPk ? '#0f172a' : (isFk ? '#1e293b' : '#334155');
      const nameWeight = (isPk || isFk) ? 'bold' : 'normal';

      svg += `
            <!-- Field: ${f.name} -->
            <text x="${t.x + 10}" y="${rowY}" font-size="10.5" font-weight="${nameWeight}" fill="${nameColor}">${f.name}</text>
      `;

      if (isPk) {
        svg += `
            <!-- PK Badge -->
            <rect x="${t.x + 115}" y="${rowY - 10}" width="22" height="13" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="0.8"/>
            <text x="${t.x + 126}" y="${rowY}" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#b45309">PK</text>
        `;
      } else if (isFk) {
        svg += `
            <!-- FK Badge -->
            <rect x="${t.x + 115}" y="${rowY - 10}" width="22" height="13" rx="3" fill="#e0f2fe" stroke="#0284c7" stroke-width="0.8"/>
            <text x="${t.x + 126}" y="${rowY}" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#0369a1">FK</text>
        `;
      }

      svg += `
            <text x="${t.x + t.w - 10}" y="${rowY}" text-anchor="end" font-size="9.5" fill="#64748b">${f.type}</text>
      `;

      rowY += 21;
    }

    svg += `
          </g>
    `;
  }

  svg += `
        </svg>
  `;
  return svg;
}

// Read complete_manuscript_diagrams_suite.html
const filePath = 'docs/complete_manuscript_diagrams_suite.html';
let html = fs.readFileSync(filePath, 'utf8');

// Build the ERD card HTML
const erdSvg = generateERDSvg();
const erdCard = `
    <!-- ======================================================= -->
    <!-- DIAGRAM: FIGURE 4.13 ENTITY-RELATIONSHIP DIAGRAM (ERD)  -->
    <!-- Matching User Uploaded Reference Image (SaloPorac)      -->
    <!-- ======================================================= -->
    <div class="diagram-card" id="card-erd">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.13: Entity-Relationship Diagram (ERD) of LibraLink</div>
          <div class="card-desc">Relational Data Model: Multi-Tenancy (Cyan), Catalog &amp; Physical Inventory (Green), Circulation &amp; Requests (Orange), and Fines (Purple)</div>
        </div>
        <div class="btn-group">
          <button class="btn" onclick="copySvg('svg-erd')">📋 Copy SVG</button>
          <button class="btn" onclick="downloadSvg('svg-erd', 'Figure_4_13_Entity_Relationship_Diagram_ERD.svg')">⬇ Download SVG</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-erd', 'Figure_4_13_Entity_Relationship_Diagram_ERD.png', 1420, 980)">🖼 Download High-Res PNG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${erdSvg}
      </div>
    </div>
`;

// Insert ERD card before card-dfd0
if (!html.includes('id="card-erd"')) {
  html = html.replace('<div class="diagram-card" id="card-dfd0">', erdCard + '\n    <div class="diagram-card" id="card-dfd0">');
}

// Update switchTab cards mapping
if (!html.includes('erd: document.getElementById(\'card-erd\')')) {
  html = html.replace('dfd0: document.getElementById(\'card-dfd0\'),', 'erd: document.getElementById(\'card-erd\'),\n        dfd0: document.getElementById(\'card-dfd0\'),');
}

// Update exportAllPngs to also export ERD
if (!html.includes('Figure_4_13_Entity_Relationship_Diagram_ERD.png')) {
  html = html.replace(
    'downloadPng(\'svg-dfd0\', \'Figure_4_11_DFD_Level_0_Context_Diagram.png\', 1100, 920);',
    'downloadPng(\'svg-erd\', \'Figure_4_13_Entity_Relationship_Diagram_ERD.png\', 1420, 980);\n      setTimeout(() => downloadPng(\'svg-dfd0\', \'Figure_4_11_DFD_Level_0_Context_Diagram.png\', 1100, 920), 400);'
  );
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('Successfully added ERD to docs/complete_manuscript_diagrams_suite.html!');
