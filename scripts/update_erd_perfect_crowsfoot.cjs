const fs = require('fs');

function generateERDSvg() {
  const width = 1420;
  const height = 980;

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
      id: 'categories', x: 400, y: 95, w: 230, h: 115, headerBg: '#059669', title: 'categories',
      fields: [
        { name: 'category_id', key: 'PK', type: 'integer' },
        { name: 'category_name', key: '', type: 'varchar(100)' },
        { name: 'description', key: '', type: 'text' },
        { name: 'created_at', key: '', type: 'timestamp' }
      ]
    },
    {
      id: 'authors', x: 400, y: 245, w: 230, h: 90, headerBg: '#059669', title: 'authors',
      fields: [
        { name: 'author_id', key: 'PK', type: 'integer' },
        { name: 'author_name', key: '', type: 'varchar(255)' },
      ]
    },
    {
      id: 'books', x: 400, y: 370, w: 230, h: 255, headerBg: '#059669', title: 'books',
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
      id: 'book_copies', x: 400, y: 665, w: 230, h: 185, headerBg: '#059669', title: 'book_copies',
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
      id: 'borrow_requests', x: 750, y: 150, w: 240, h: 235, headerBg: '#d97706', title: 'borrow_requests',
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
      id: 'borrow_request_items', x: 750, y: 425, w: 240, h: 165, headerBg: '#d97706', title: 'borrow_request_items',
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
      id: 'borrow_transactions', x: 750, y: 630, w: 240, h: 235, headerBg: '#d97706', title: 'borrow_transactions',
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
      id: 'fines', x: 1110, y: 630, w: 230, h: 215, headerBg: '#7c3aed', title: 'fines',
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

  // Helper functions for exact dbdiagram.io Crow's Foot rendering
  function renderOneBar(x, y, orientation = 'vertical') {
    // Crossbar '+' at distance 8px from table
    if (orientation === 'vertical') {
      return `<line x1="${x}" y1="${y - 6}" x2="${x}" y2="${y + 6}" stroke="#475569" stroke-width="1.8"/>`;
    } else {
      return `<line x1="${x - 6}" y1="${y}" x2="${x + 6}" y2="${y}" stroke="#475569" stroke-width="1.8"/>`;
    }
  }

  function renderCrowsFoot(x, y, dir = 'right') {
    // dir='right' means the line ends at x going rightwards into the table at (x, y)
    // dir='left' means the line ends at x going leftwards into the table at (x, y)
    if (dir === 'right') {
      // Fork opening to the right: vertex at x - 12
      return `
        <path d="M ${x - 12} ${y} L ${x} ${y - 6} M ${x - 12} ${y} L ${x} ${y} M ${x - 12} ${y} L ${x} ${y + 6}" stroke="#475569" stroke-width="1.5" fill="none"/>
        <line x1="${x - 12}" y1="${y - 6}" x2="${x - 12}" y2="${y + 6}" stroke="#475569" stroke-width="1.8"/>
      `;
    } else if (dir === 'left') {
      // Fork opening to the left: vertex at x + 12
      return `
        <path d="M ${x + 12} ${y} L ${x} ${y - 6} M ${x + 12} ${y} L ${x} ${y} M ${x + 12} ${y} L ${x} ${y + 6}" stroke="#475569" stroke-width="1.5" fill="none"/>
        <line x1="${x + 12}" y1="${y - 6}" x2="${x + 12}" y2="${y + 6}" stroke="#475569" stroke-width="1.8"/>
      `;
    }
  }

  let svg = `
        <svg id="svg-erd" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:Arial, Helvetica, sans-serif;">
          <defs>
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
          <!-- Exact dbdiagram.io Crossbar '+' and Fork '<'   -->
          <!-- ============================================== -->
          <g id="erd-lines" stroke="#475569" stroke-width="1.5" fill="none">

            <!-- 1. roles.role_id (1) -> users.role_id (M) -->
            <path d="M 280 139 L 325 139 L 325 556 L 280 556"/>

            <!-- 2. schools.school_id (1) -> users.school_id (M) -->
            <path d="M 280 264 L 310 264 L 310 535 L 280 535"/>

            <!-- 3. users.user_id (1) -> verification_codes.user_id (M) -->
            <path d="M 280 514 L 320 514 L 320 825 L 280 825"/>

            <!-- 4. schools.school_id (1) -> books.school_id (M) -->
            <path d="M 280 264 L 340 264 L 340 435 L 400 435"/>

            <!-- 5. categories.category_id (1) -> books.category_id (M) -->
            <path d="M 515 210 L 515 310 L 370 310 L 370 456 L 400 456"/>

            <!-- 6. books.book_id (1) -> book_copies.book_id (M) -->
            <path d="M 515 625 L 515 645 L 370 645 L 370 730 L 400 730"/>

            <!-- 7. users.user_id (1) -> borrow_requests.student_id (M) -->
            <path d="M 280 514 L 360 514 L 360 215 L 750 215"/>

            <!-- 8. borrow_requests.request_id (1) -> borrow_request_items.request_id (M) -->
            <path d="M 870 385 L 870 425"/>

            <!-- 9. books.book_id (1) -> borrow_request_items.book_id (M) -->
            <path d="M 630 414 L 690 414 L 690 511 L 750 511"/>

            <!-- 10. book_copies.copy_id (1) -> borrow_request_items.copy_id (M) -->
            <path d="M 630 709 L 680 709 L 680 532 L 750 532"/>

            <!-- 11. borrow_requests.request_id (1) -> borrow_transactions.request_id (M) -->
            <path d="M 990 194 L 1030 194 L 1030 695 L 990 695"/>

            <!-- 12. borrow_transactions.borrow_id (1) -> fines.borrow_id (M) -->
            <path d="M 990 674 L 1110 674"/>

            <!-- 13. users.user_id (1) -> fines.user_id (M) -->
            <path d="M 165 725 L 165 940 L 1225 940 L 1225 845"/>
          </g>

          <!-- ============================================== -->
          <!-- EXACT CROSSBARS '+' AND CROW'S FEET '<'        -->
          <!-- ============================================== -->
          <g id="erd-cardinality-symbols">
            <!-- 1. roles (1) -> users (M) -->
            ${renderOneBar(288, 139)}
            ${renderCrowsFoot(280, 556, 'left')}

            <!-- 2. schools (1) -> users (M) -->
            ${renderOneBar(288, 264)}
            ${renderCrowsFoot(280, 535, 'left')}

            <!-- 3. users (1) -> verification_codes (M) -->
            ${renderOneBar(288, 514)}
            ${renderCrowsFoot(280, 825, 'left')}

            <!-- 4. schools (1) -> books (M) -->
            ${renderCrowsFoot(400, 435, 'right')}

            <!-- 5. categories (1) -> books (M) -->
            ${renderOneBar(515, 218, 'horizontal')}
            ${renderCrowsFoot(400, 456, 'right')}

            <!-- 6. books (1) -> book_copies (M) -->
            ${renderOneBar(515, 633, 'horizontal')}
            ${renderCrowsFoot(400, 730, 'right')}

            <!-- 7. users (1) -> borrow_requests (M) -->
            ${renderCrowsFoot(750, 215, 'right')}

            <!-- 8. borrow_requests (1) -> borrow_request_items (M) -->
            ${renderOneBar(870, 393, 'horizontal')}
            <path d="M 870 413 L 864 425 M 870 413 L 870 425 M 870 413 L 876 425" stroke="#475569" stroke-width="1.5" fill="none"/>
            <line x1="864" y1="413" x2="876" y2="413" stroke="#475569" stroke-width="1.8"/>

            <!-- 9. books (1) -> borrow_request_items (M) -->
            ${renderOneBar(638, 414)}
            ${renderCrowsFoot(750, 511, 'right')}

            <!-- 10. book_copies (1) -> borrow_request_items (M) -->
            ${renderOneBar(638, 709)}
            ${renderCrowsFoot(750, 532, 'right')}

            <!-- 11. borrow_requests (1) -> borrow_transactions (M) -->
            ${renderOneBar(982, 194)}
            ${renderCrowsFoot(990, 695, 'left')}

            <!-- 12. borrow_transactions (1) -> fines (M) -->
            ${renderOneBar(998, 674)}
            ${renderCrowsFoot(1110, 695, 'right')}

            <!-- 13. users (1) -> fines (M) -->
            ${renderOneBar(165, 733, 'horizontal')}
            <path d="M 1225 857 L 1219 845 M 1225 857 L 1225 845 M 1225 857 L 1231 845" stroke="#475569" stroke-width="1.5" fill="none"/>
            <line x1="1219" y1="857" x2="1231" y2="857" stroke="#475569" stroke-width="1.8"/>
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

// Replace existing SVG in card-erd
const erdSvg = generateERDSvg();

const cardErdRegex = /<div class="diagram-card" id="card-erd">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newCardErd = `    <div class="diagram-card" id="card-erd">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.13: Entity-Relationship Diagram (ERD) of LibraLink</div>
          <div class="card-desc">Relational Data Model with Exact dbdiagram.io One-to-Many Crow's Foot &amp; Crossbar Connectors</div>
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
    </div>`;

html = html.replace(cardErdRegex, newCardErd);

fs.writeFileSync(filePath, html, 'utf8');
console.log('Successfully updated ERD with exact dbdiagram.io crows foot connectors in complete_manuscript_diagrams_suite.html!');
