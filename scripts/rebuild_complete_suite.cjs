const fs = require('fs');
const { getArchitectureSvg } = require('./generate_architecture_svg.cjs');
const { getFlowchartSvg } = require('./generate_flowchart_svg.cjs');
const { getAuthUseCaseSvg } = require('./generate_auth_usecase_svg.cjs');
const { getCompleteUseCaseSvg } = require('./generate_complete_usecase_svg.cjs');

// 1. ERD SVG Generator (Corrected Crow's foot pointing into the tables, crossbar on one-side)
function getERDSvg() {
  const width = 1420;
  const height = 980;

  const tables = [
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

  function drawOneCrossbar(x, y) {
    return `<line x1="${x}" y1="${y - 7}" x2="${x}" y2="${y + 7}" stroke="#475569" stroke-width="1.8"/>`;
  }

  function drawManyCrow(targetX, targetY, enterFrom = 'left') {
    if (enterFrom === 'left') {
      const fromX = targetX - 14;
      return `
        <line x1="${fromX}" y1="${targetY - 7}" x2="${fromX}" y2="${targetY + 7}" stroke="#475569" stroke-width="1.8"/>
        <path d="M ${fromX} ${targetY} L ${targetX} ${targetY - 6} M ${fromX} ${targetY} L ${targetX} ${targetY} M ${fromX} ${targetY} L ${targetX} ${targetY + 6}" stroke="#475569" stroke-width="1.6" fill="none"/>
      `;
    } else {
      const fromX = targetX + 14;
      return `
        <line x1="${fromX}" y1="${targetY - 7}" x2="${fromX}" y2="${targetY + 7}" stroke="#475569" stroke-width="1.8"/>
        <path d="M ${fromX} ${targetY} L ${targetX} ${targetY - 6} M ${fromX} ${targetY} L ${targetX} ${targetY} M ${fromX} ${targetY} L ${targetX} ${targetY + 6}" stroke="#475569" stroke-width="1.6" fill="none"/>
      `;
    }
  }

  let s = `
        <svg id="svg-erd" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:Arial, Helvetica, sans-serif;">
          <defs>
            <filter id="erd-shadow" x="-3%" y="-3%" width="106%" height="108%" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="1.5"/>
              <feComponentTransfer><feFuncA type="linear" slope="0.08"/></feComponentTransfer>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <text x="30" y="35" font-weight="bold" font-size="16" fill="#000000">Figure 4.13</text>
          <text x="30" y="55" font-style="italic" font-size="14" fill="#333333">Entity-Relationship Diagram (ERD) of LibraLink Multi-Campus Library System</text>

          <g id="erd-legend" transform="translate(850, 22)">
            <rect x="0" y="0" width="490" height="44" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
            <line x1="20" y1="22" x2="60" y2="22" stroke="#475569" stroke-width="1.6"/>
            <line x1="40" y1="15" x2="40" y2="29" stroke="#475569" stroke-width="1.8"/>
            <text x="70" y="26" font-size="11.5" font-weight="bold" fill="#0369a1">One (Primary Key)</text>

            <line x1="250" y1="22" x2="280" y2="22" stroke="#475569" stroke-width="1.6"/>
            <line x1="280" y1="15" x2="280" y2="29" stroke="#475569" stroke-width="1.8"/>
            <path d="M 280 22 L 294 16 M 280 22 L 294 22 M 280 22 L 294 28" stroke="#475569" stroke-width="1.6" fill="none"/>
            <text x="305" y="26" font-size="11.5" font-weight="bold" fill="#d97706">Many (Foreign Key)</text>
          </g>

          <g id="erd-wires" stroke="#475569" stroke-width="1.6" fill="none">
            <path d="M 280 139 L 325 139 L 325 556 L 280 556"/>
            <path d="M 280 264 L 310 264 L 310 535 L 280 535"/>
            <path d="M 280 514 L 320 514 L 320 825 L 280 825"/>
            <path d="M 280 264 L 340 264 L 340 435 L 400 435"/>
            <path d="M 400 139 L 365 139 L 365 456 L 400 456"/>
            <path d="M 400 414 L 350 414 L 350 730 L 400 730"/>
            <path d="M 280 514 L 355 514 L 355 80 L 710 80 L 710 215 L 750 215"/>
            <path d="M 750 194 L 700 194 L 700 490 L 750 490"/>
            <path d="M 630 414 L 690 414 L 690 511 L 750 511"/>
            <path d="M 630 709 L 680 709 L 680 532 L 750 532"/>
            <path d="M 990 194 L 1030 194 L 1030 695 L 990 695"/>
            <path d="M 990 674 L 1050 674 L 1050 695 L 1110 695"/>
            <path d="M 355 514 L 355 940 L 1070 940 L 1070 716 L 1110 716"/>
          </g>

          <g id="erd-cardinality">
            ${drawOneCrossbar(288, 139)}
            ${drawManyCrow(280, 556, 'right')}

            ${drawOneCrossbar(288, 264)}
            ${drawManyCrow(280, 535, 'right')}

            ${drawOneCrossbar(288, 514)}
            ${drawManyCrow(280, 825, 'right')}

            ${drawManyCrow(400, 435, 'left')}

            ${drawOneCrossbar(392, 139)}
            ${drawManyCrow(400, 456, 'left')}

            ${drawOneCrossbar(392, 414)}
            ${drawManyCrow(400, 730, 'left')}

            ${drawManyCrow(750, 215, 'left')}

            ${drawOneCrossbar(742, 194)}
            ${drawManyCrow(750, 490, 'left')}

            ${drawOneCrossbar(638, 414)}
            ${drawManyCrow(750, 511, 'left')}

            ${drawOneCrossbar(638, 709)}
            ${drawManyCrow(750, 532, 'left')}

            ${drawOneCrossbar(998, 194)}
            ${drawManyCrow(990, 695, 'right')}

            ${drawOneCrossbar(998, 674)}
            ${drawManyCrow(1110, 695, 'left')}

            ${drawManyCrow(1110, 716, 'left')}
          </g>
  `;

  for (const t of tables) {
    s += `
          <g id="table-${t.id}" filter="url(#erd-shadow)">
            <rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="6" ry="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.3"/>
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

      s += `
            <text x="${t.x + 10}" y="${rowY}" font-size="10.5" font-weight="${nameWeight}" fill="${nameColor}">${f.name}</text>
      `;
      if (isPk) {
        s += `
            <rect x="${t.x + 115}" y="${rowY - 10}" width="22" height="13" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="0.8"/>
            <text x="${t.x + 126}" y="${rowY}" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#b45309">PK</text>
        `;
      } else if (isFk) {
        s += `
            <rect x="${t.x + 115}" y="${rowY - 10}" width="22" height="13" rx="3" fill="#e0f2fe" stroke="#0284c7" stroke-width="0.8"/>
            <text x="${t.x + 126}" y="${rowY}" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#0369a1">FK</text>
        `;
      }
      s += `
            <text x="${t.x + t.w - 10}" y="${rowY}" text-anchor="end" font-size="9.5" fill="#64748b">${f.type}</text>
      `;
      rowY += 21;
    }
    s += `</g>`;
  }
  s += `</svg>`;
  return s;
}

// 2. Navigation Structure SVG (SaloPorac 4.8c 3-column format)
function getNavSvg() {
  const width = 980;
  const height = 840;

  return `
        <svg id="svg-nav" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:Arial, Helvetica, sans-serif;">
          <defs>
            <marker id="nav-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#475569"/>
            </marker>
            <filter id="nav-shadow" x="-3%" y="-3%" width="106%" height="110%" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="1.5"/>
              <feComponentTransfer><feFuncA type="linear" slope="0.08"/></feComponentTransfer>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <text x="30" y="35" font-weight="bold" font-size="16" fill="#000000">Figure 4.15</text>
          <text x="30" y="55" font-style="italic" font-size="14" fill="#333333">Librarian Scoped Navigation Structure of LibraLink</text>

          <g id="nav-lines" stroke="#475569" stroke-width="1.5" fill="none">
            <line x1="470" y1="135" x2="560" y2="135" marker-end="url(#nav-arrow)"/>
            <path d="M 650 170 L 650 205 L 230 205 L 230 250" marker-end="url(#nav-arrow)"/>
            <path d="M 650 205 L 505 205 L 505 250" marker-end="url(#nav-arrow)"/>
            <path d="M 650 205 L 780 205 L 780 250" marker-end="url(#nav-arrow)"/>
            <line x1="230" y1="320" x2="230" y2="365" marker-end="url(#nav-arrow)"/>
            <line x1="230" y1="435" x2="230" y2="480" marker-end="url(#nav-arrow)"/>
            <path d="M 230 550 L 230 630 L 290 630" marker-end="url(#nav-arrow)"/>
            <line x1="505" y1="320" x2="505" y2="365" marker-end="url(#nav-arrow)"/>
            <line x1="505" y1="435" x2="505" y2="595" marker-end="url(#nav-arrow)"/>
            <line x1="780" y1="320" x2="780" y2="365" marker-end="url(#nav-arrow)"/>
            <path d="M 780 435 L 780 630 L 720 630" marker-end="url(#nav-arrow)"/>
            <line x1="505" y1="665" x2="505" y2="715" marker-end="url(#nav-arrow)"/>
            <path d="M 415 750 L 95 750 L 95 135 L 290 135" marker-end="url(#nav-arrow)"/>
          </g>

          <g id="node-login" filter="url(#nav-shadow)">
            <rect x="290" y="100" width="180" height="70" rx="12" ry="12" fill="#e9d5ff" stroke="#a855f7" stroke-width="1.6"/>
            <rect x="372" y="112" width="16" height="12" rx="2" fill="#7e22ce"/>
            <path d="M 375 112 L 375 107 C 375 104, 385 104, 385 107 L 385 112" fill="none" stroke="#7e22ce" stroke-width="2"/>
            <text x="380" y="140" text-anchor="middle" font-weight="bold" font-size="13" fill="#581c87">LOGIN</text>
            <text x="380" y="156" text-anchor="middle" font-size="11" fill="#7e22ce">(Authentication)</text>
          </g>

          <g id="node-dashboard" filter="url(#nav-shadow)">
            <rect x="560" y="100" width="180" height="70" rx="12" ry="12" fill="#dcfce7" stroke="#22c55e" stroke-width="1.6"/>
            <rect x="642" y="118" width="4" height="8" fill="#15803d"/>
            <rect x="648" y="114" width="4" height="12" fill="#15803d"/>
            <rect x="654" y="110" width="4" height="16" fill="#15803d"/>
            <text x="650" y="140" text-anchor="middle" font-weight="bold" font-size="13" fill="#14532d">DASHBOARD</text>
            <text x="650" y="156" text-anchor="middle" font-size="11" fill="#15803d">(Overview)</text>
          </g>

          <g id="node-col1-1" filter="url(#nav-shadow)">
            <rect x="140" y="250" width="180" height="70" rx="12" ry="12" fill="#dcfce7" stroke="#22c55e" stroke-width="1.6"/>
            <text x="230" y="282" text-anchor="middle" font-weight="bold" font-size="12.5" fill="#14532d">CIRCULATION DESK</text>
            <text x="230" y="299" text-anchor="middle" font-size="11" fill="#15803d">(Counter Check-in/out)</text>
          </g>
          <g id="node-col1-2" filter="url(#nav-shadow)">
            <rect x="140" y="365" width="180" height="70" rx="12" ry="12" fill="#dcfce7" stroke="#22c55e" stroke-width="1.6"/>
            <text x="230" y="397" text-anchor="middle" font-weight="bold" font-size="12.5" fill="#14532d">TOKEN VERIFIER</text>
            <text x="230" y="414" text-anchor="middle" font-size="11" fill="#15803d">(Scan/Validate QR Token)</text>
          </g>
          <g id="node-col1-3" filter="url(#nav-shadow)">
            <rect x="140" y="480" width="180" height="70" rx="12" ry="12" fill="#dcfce7" stroke="#22c55e" stroke-width="1.6"/>
            <text x="230" y="512" text-anchor="middle" font-weight="bold" font-size="12.5" fill="#14532d">DISPENSE &amp; RETURN</text>
            <text x="230" y="529" text-anchor="middle" font-size="11" fill="#15803d">(Physical Circulation)</text>
          </g>

          <g id="node-col2-1" filter="url(#nav-shadow)">
            <rect x="415" y="250" width="180" height="70" rx="12" ry="12" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.6"/>
            <text x="505" y="282" text-anchor="middle" font-weight="bold" font-size="12.5" fill="#0369a1">BORROW REQUESTS</text>
            <text x="505" y="299" text-anchor="middle" font-size="11" fill="#0284c7">(Pending Request Inbox)</text>
          </g>
          <g id="node-col2-2" filter="url(#nav-shadow)">
            <rect x="415" y="365" width="180" height="70" rx="12" ry="12" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.6"/>
            <text x="505" y="397" text-anchor="middle" font-weight="bold" font-size="12.5" fill="#0369a1">REQUEST APPROVAL</text>
            <text x="505" y="414" text-anchor="middle" font-size="11" fill="#0284c7">(Standing &amp; Pass Issuance)</text>
          </g>

          <g id="node-col3-1" filter="url(#nav-shadow)">
            <rect x="690" y="250" width="180" height="70" rx="12" ry="12" fill="#ede9fe" stroke="#8b5cf6" stroke-width="1.6"/>
            <text x="780" y="282" text-anchor="middle" font-weight="bold" font-size="12.5" fill="#5b21b6">BOOK HOLDINGS</text>
            <text x="780" y="299" text-anchor="middle" font-size="11" fill="#6d28d9">(Multi-School Catalog)</text>
          </g>
          <g id="node-col3-2" filter="url(#nav-shadow)">
            <rect x="690" y="365" width="180" height="70" rx="12" ry="12" fill="#ede9fe" stroke="#8b5cf6" stroke-width="1.6"/>
            <text x="780" y="397" text-anchor="middle" font-weight="bold" font-size="12.5" fill="#5b21b6">INVENTORY AUDIT</text>
            <text x="780" y="414" text-anchor="middle" font-size="11" fill="#6d28d9">(Stock &amp; Shelf Location)</text>
          </g>

          <g id="node-core" filter="url(#nav-shadow)">
            <rect x="290" y="595" width="430" height="70" rx="12" ry="12" fill="#e2e8f0" stroke="#64748b" stroke-width="1.6"/>
            <circle cx="370" cy="630" r="7" fill="#475569"/>
            <circle cx="370" cy="630" r="3" fill="#e2e8f0"/>
            <path d="M 370 619 L 370 622 M 370 638 L 370 641 M 359 630 L 362 630 M 378 630 L 381 630" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
            <text x="515" y="626" text-anchor="middle" font-weight="bold" font-size="13" fill="#1e293b">LIBRARIAN CORE FUNCTIONS</text>
            <text x="515" y="644" text-anchor="middle" font-size="11" fill="#475569">(Consortium Operations &amp; Circulation Desk)</text>
          </g>

          <g id="node-logout" filter="url(#nav-shadow)">
            <rect x="415" y="715" width="180" height="65" rx="12" ry="12" fill="#fecaca" stroke="#ef4444" stroke-width="1.6"/>
            <text x="505" y="744" text-anchor="middle" font-weight="bold" font-size="13" fill="#991b1b">LOGOUT</text>
            <text x="505" y="762" text-anchor="middle" font-size="11" fill="#dc2626">(END SESSION)</text>
          </g>
        </svg>
  `;
}

// Import 4-actor Sprint Use Case SVG generators
const { getSprint1Svg, getSprint2Svg, getSprint3Svg } = require('./generate_all_sprint_usecases_4actors.cjs');
const svgSprint1 = getSprint1Svg();
const svgSprint2 = getSprint2Svg();
const svgSprint3 = getSprint3Svg();

// Read DFD 0 and DFD 1 from git or history
// Let's get the exact DFD 0 and DFD 1 from git or reconstruct them cleanly
const gitDfdFile = 'docs/complete_manuscript_diagrams_suite.html';

// Let's build DFD 0 SVG
function getDfd0Svg() {
  return `
        <svg id="svg-dfd0" viewBox="0 0 1100 920" width="1100" height="920" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:Arial, Helvetica, sans-serif;">
          <defs>
            <marker id="arrow-dfd0" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#334155"/>
            </marker>
            <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2"/>
              <feComponentTransfer><feFuncA type="linear" slope="0.12"/></feComponentTransfer>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <text x="30" y="35" font-weight="bold" font-size="16" fill="#000000">Figure 4.11</text>
          <text x="30" y="55" font-style="italic" font-size="14" fill="#333333">Context Diagram Level 0 — LibraLink Multi-Campus Inter-Library System</text>

          <g id="process-0" filter="url(#shadow)">
            <rect x="450" y="340" width="200" height="290" rx="30" ry="30" fill="#e2e8f0" stroke="#475569" stroke-width="2.2" />
            <path d="M 450 370 C 450 353, 463 340, 480 340 L 620 340 C 637 340, 650 353, 650 370 L 650 395 L 450 395 Z" fill="#cbd5e1" stroke="#475569" stroke-width="2.2"/>
            <text x="550" y="378" text-anchor="middle" font-weight="bold" font-size="24" fill="#0f172a">0</text>
            <line x1="450" y1="395" x2="650" y2="395" stroke="#475569" stroke-width="2"/>
            <text x="550" y="445" text-anchor="middle" font-weight="bold" font-size="14" fill="#0f172a">LibraLink</text>
            <text x="550" y="470" text-anchor="middle" font-size="12" fill="#1e293b">Centralized</text>
            <text x="550" y="490" text-anchor="middle" font-size="12" fill="#1e293b">Inter-Library</text>
            <text x="550" y="510" text-anchor="middle" font-size="12" fill="#1e293b">Resource Sharing</text>
            <text x="550" y="530" text-anchor="middle" font-size="12" fill="#1e293b">&amp; Borrowing System</text>
            <text x="550" y="555" text-anchor="middle" font-size="11" font-weight="600" fill="#334155">for GNC and Santa Rita</text>
            <text x="550" y="572" text-anchor="middle" font-size="11" font-weight="600" fill="#334155">College of Pampanga</text>
          </g>

          <g id="entity-student" filter="url(#shadow)">
            <rect x="70" y="210" width="145" height="75" rx="16" ry="16" fill="#86efac" stroke="#16a34a" stroke-width="1.8"/>
            <rect x="80" y="200" width="22" height="24" rx="4" ry="4" fill="#ffffff" stroke="#16a34a" stroke-width="1.4"/>
            <circle cx="91" cy="207" r="3.5" fill="#16a34a"/>
            <path d="M 85 219 C 85 214, 97 214, 97 219 Z" fill="#16a34a"/>
            <text x="142" y="246" text-anchor="middle" font-weight="bold" font-size="14" fill="#14532d">Student</text>
            <text x="142" y="264" text-anchor="middle" font-size="11" fill="#166534">(GNC / SRC Patron)</text>
          </g>

          <g id="entity-home-librarian" filter="url(#shadow)">
            <rect x="70" y="440" width="145" height="75" rx="16" ry="16" fill="#f3e8ff" stroke="#9333ea" stroke-width="1.8"/>
            <rect x="80" y="430" width="22" height="24" rx="4" ry="4" fill="#ffffff" stroke="#9333ea" stroke-width="1.4"/>
            <circle cx="91" cy="437" r="3.5" fill="#9333ea"/>
            <path d="M 85 449 C 85 444, 97 444, 97 449 Z" fill="#9333ea"/>
            <text x="142" y="474" text-anchor="middle" font-weight="bold" font-size="13" fill="#581c87">Home School</text>
            <text x="142" y="492" text-anchor="middle" font-weight="bold" font-size="13" fill="#581c87">Librarian</text>
          </g>

          <g id="entity-partner-librarian" filter="url(#shadow)">
            <rect x="70" y="660" width="145" height="75" rx="16" ry="16" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
            <rect x="80" y="650" width="22" height="24" rx="4" ry="4" fill="#ffffff" stroke="#ea580c" stroke-width="1.4"/>
            <circle cx="91" cy="657" r="3.5" fill="#ea580c"/>
            <path d="M 85 669 C 85 664, 97 664, 97 669 Z" fill="#ea580c"/>
            <text x="142" y="694" text-anchor="middle" font-weight="bold" font-size="13" fill="#7c2d12">Partner School</text>
            <text x="142" y="712" text-anchor="middle" font-weight="bold" font-size="13" fill="#7c2d12">Librarian</text>
          </g>

          <g id="entity-email" filter="url(#shadow)">
            <rect x="870" y="230" width="155" height="70" rx="16" ry="16" fill="#64748b" stroke="#334155" stroke-width="1.8"/>
            <rect x="880" y="220" width="22" height="22" rx="4" ry="4" fill="#ffffff" stroke="#334155" stroke-width="1.4"/>
            <path d="M 883 226 L 891 233 L 899 226" fill="none" stroke="#334155" stroke-width="1.5"/>
            <rect x="883" y="226" width="16" height="11" fill="none" stroke="#334155" stroke-width="1.2"/>
            <text x="947" y="260" text-anchor="middle" font-weight="bold" font-size="12.5" fill="#ffffff">Email Notification</text>
            <text x="947" y="278" text-anchor="middle" font-size="11.5" fill="#e2e8f0">Service (SMTP)</text>
          </g>

          <g id="entity-super-admin" filter="url(#shadow)">
            <rect x="870" y="470" width="155" height="75" rx="16" ry="16" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
            <rect x="880" y="460" width="22" height="24" rx="4" ry="4" fill="#ffffff" stroke="#e11d48" stroke-width="1.4"/>
            <circle cx="891" cy="467" r="3.5" fill="#e11d48"/>
            <path d="M 885 479 C 885 474, 897 474, 897 479 Z" fill="#e11d48"/>
            <text x="947" y="504" text-anchor="middle" font-weight="bold" font-size="13" fill="#881337">Super</text>
            <text x="947" y="522" text-anchor="middle" font-weight="bold" font-size="13" fill="#881337">Administrator</text>
          </g>

          <g id="entity-cloud-auth" filter="url(#shadow)">
            <rect x="870" y="680" width="155" height="75" rx="16" ry="16" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
            <rect x="880" y="670" width="22" height="24" rx="4" ry="4" fill="#ffffff" stroke="#0284c7" stroke-width="1.4"/>
            <ellipse cx="891" cy="677" rx="6" ry="2.5" fill="none" stroke="#0284c7" stroke-width="1.2"/>
            <path d="M 885 677 L 885 687 C 885 689, 897 689, 897 687 L 897 677" fill="none" stroke="#0284c7" stroke-width="1.2"/>
            <text x="947" y="714" text-anchor="middle" font-weight="bold" font-size="12.5" fill="#0369a1">Supabase</text>
            <text x="947" y="732" text-anchor="middle" font-size="11.5" fill="#0284c7">Cloud Database</text>
          </g>

          <!-- Flows -->
          <path d="M 215 225 L 360 225 Q 380 225 380 245 L 380 410 Q 380 430 400 430 L 450 430" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="290" y="218" text-anchor="middle" font-size="10.5" fill="#1e293b">Credentials, Catalog Query &amp; Request</text>

          <path d="M 450 450 L 390 450 Q 370 450 370 430 L 370 265 Q 370 245 350 245 L 215 245" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="290" y="258" text-anchor="middle" font-size="10.5" fill="#1e293b">Holdings, Request Status &amp; Digital QR Pass</text>

          <path d="M 215 270 L 330 270 Q 350 270 350 290 L 350 460 Q 350 470 400 470 L 450 470" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="280" y="284" text-anchor="middle" font-size="10.5" fill="#1e293b">Present QR Token at Counter</text>

          <path d="M 215 465 L 450 465" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="330" y="458" text-anchor="middle" font-size="10.5" fill="#1e293b">Approval / Rejection Decision &amp; Rules</text>

          <path d="M 450 490 L 215 490" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="330" y="504" text-anchor="middle" font-size="10.5" fill="#1e293b">Pending Borrow Requests Queue</text>

          <path d="M 215 680 L 370 680 Q 390 680 390 660 L 390 530 Q 390 510 410 510 L 450 510" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="290" y="673" text-anchor="middle" font-size="10.5" fill="#1e293b">Scan Token, Dispense &amp; Return Event</text>

          <path d="M 450 535 L 400 535 Q 380 535 380 555 L 380 700 Q 380 710 360 710 L 215 710" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="290" y="725" text-anchor="middle" font-size="10.5" fill="#1e293b">Token Validity &amp; Circulation History</text>

          <path d="M 650 430 L 730 430 Q 750 430 750 410 L 750 265 Q 750 250 770 250 L 870 250" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="760" y="242" text-anchor="middle" font-size="10.5" fill="#1e293b">Send Approval &amp; Due Date Alerts</text>

          <path d="M 870 275 L 780 275 Q 765 275 765 295 L 765 440 Q 765 450 740 450 L 650 450" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="760" y="288" text-anchor="middle" font-size="10.5" fill="#1e293b">Delivery Status &amp; Error Receipts</text>

          <path d="M 870 495 L 650 495" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="760" y="488" text-anchor="middle" font-size="10.5" fill="#1e293b">Platform Config &amp; Campus Accounts</text>

          <path d="M 650 520 L 870 520" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="760" y="534" text-anchor="middle" font-size="10.5" fill="#1e293b">Audit Logs, Inter-Library Reports</text>

          <path d="M 650 565 L 740 565 Q 760 565 760 585 L 760 700 Q 760 710 780 710 L 870 710" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="760" y="685" text-anchor="middle" font-size="10.5" fill="#1e293b">SQL Queries, Inventory Updates</text>

          <path d="M 870 730 L 775 730 Q 755 730 755 710 L 755 595 Q 755 585 735 585 L 650 585" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow-dfd0)"/>
          <text x="760" y="745" text-anchor="middle" font-size="10.5" fill="#1e293b">Normalized Data Records &amp; Tokens</text>
        </svg>
  `;
}

// Build DFD 1 SVG
function getDfd1Svg() {
  return `
        <svg id="svg-dfd1" viewBox="0 0 1150 1020" width="1150" height="1020" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:Arial, Helvetica, sans-serif;">
          <defs>
            <marker id="arrow-dfd1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000"/>
            </marker>
          </defs>

          <text x="30" y="35" font-weight="bold" font-size="16" fill="#000000">Figure 4.12</text>
          <text x="30" y="55" font-style="italic" font-size="14" fill="#333333">Level 1 Data Flow Diagram (DFD) of LibraLink Inter-Library Resource Sharing System</text>

          <!-- Entities -->
          <g id="dfd1-student">
            <rect x="40" y="110" width="130" height="190" rx="14" ry="14" fill="#ffffff" stroke="#000000" stroke-width="1.8" />
            <text x="105" y="210" text-anchor="middle" font-weight="bold" font-size="14" fill="#000000">STUDENT</text>
          </g>

          <g id="dfd1-homelib">
            <rect x="40" y="480" width="130" height="180" rx="14" ry="14" fill="#ffffff" stroke="#000000" stroke-width="1.8" />
            <text x="105" y="565" text-anchor="middle" font-weight="bold" font-size="13" fill="#000000">HOME</text>
            <text x="105" y="585" text-anchor="middle" font-weight="bold" font-size="13" fill="#000000">LIBRARIAN</text>
          </g>

          <g id="dfd1-superadmin">
            <rect x="970" y="110" width="140" height="85" rx="12" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.8" />
            <text x="1040" y="158" text-anchor="middle" font-weight="bold" font-size="13" fill="#000000">SUPER ADMIN</text>
          </g>

          <g id="dfd1-email">
            <rect x="960" y="580" width="150" height="70" rx="12" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.8" />
            <text x="1035" y="612" text-anchor="middle" font-weight="bold" font-size="12" fill="#000000">EMAIL</text>
            <text x="1035" y="628" text-anchor="middle" font-weight="bold" font-size="12" fill="#000000">NOTIFICATION</text>
          </g>

          <g id="dfd1-partnerlib">
            <rect x="960" y="740" width="150" height="80" rx="12" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.8" />
            <text x="1035" y="775" text-anchor="middle" font-weight="bold" font-size="13" fill="#000000">PARTNER</text>
            <text x="1035" y="795" text-anchor="middle" font-weight="bold" font-size="13" fill="#000000">LIBRARIAN</text>
          </g>

          <!-- Processes -->
          <g id="proc-1">
            <rect x="340" y="110" width="170" height="65" rx="12" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
            <text x="425" y="137" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">1.0 User Authentication</text>
            <text x="425" y="155" text-anchor="middle" font-size="11.5" fill="#000000">&amp; Verification Mgt</text>
          </g>

          <g id="proc-2">
            <rect x="340" y="250" width="170" height="65" rx="12" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
            <text x="425" y="277" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">2.0 Multi-School Search</text>
            <text x="425" y="295" text-anchor="middle" font-size="11.5" fill="#000000">&amp; Holding Discovery</text>
          </g>

          <g id="proc-3">
            <rect x="340" y="400" width="170" height="65" rx="12" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
            <text x="425" y="427" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">3.0 Borrow Request</text>
            <text x="425" y="445" text-anchor="middle" font-size="11.5" fill="#000000">Management &amp; Review</text>
          </g>

          <g id="proc-4">
            <rect x="340" y="580" width="170" height="65" rx="12" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
            <text x="425" y="607" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">4.0 Token Generation</text>
            <text x="425" y="625" text-anchor="middle" font-size="11.5" fill="#000000">&amp; QR Pass Issuance</text>
          </g>

          <g id="proc-5">
            <rect x="340" y="740" width="170" height="65" rx="12" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
            <text x="425" y="767" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">5.0 Counter Verification</text>
            <text x="425" y="785" text-anchor="middle" font-size="11.5" fill="#000000">&amp; Physical Circulation</text>
          </g>

          <g id="proc-6">
            <rect x="340" y="870" width="170" height="60" rx="12" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
            <text x="425" y="897" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">6.0 Audit Logging</text>
            <text x="425" y="915" text-anchor="middle" font-size="11.5" fill="#000000">&amp; System Analytics</text>
          </g>

          <!-- Stores -->
          <g id="store-d1">
            <path d="M 750 110 L 590 110 L 590 155 L 750 155" fill="none" stroke="#000000" stroke-width="1.6"/>
            <line x1="635" y1="110" x2="635" y2="155" stroke="#000000" stroke-width="1.4"/>
            <text x="612" y="137" text-anchor="middle" font-weight="bold" font-size="12" fill="#000000">D1</text>
            <text x="692" y="137" text-anchor="middle" font-size="11.5" fill="#000000">User Data Store</text>
          </g>

          <g id="store-d2">
            <path d="M 750 250 L 590 250 L 590 295 L 750 295" fill="none" stroke="#000000" stroke-width="1.6"/>
            <line x1="635" y1="250" x2="635" y2="295" stroke="#000000" stroke-width="1.4"/>
            <text x="612" y="277" text-anchor="middle" font-weight="bold" font-size="12" fill="#000000">D2</text>
            <text x="692" y="277" text-anchor="middle" font-size="11.5" fill="#000000">Book Holdings Store</text>
          </g>

          <g id="store-d3">
            <path d="M 750 400 L 590 400 L 590 445 L 750 445" fill="none" stroke="#000000" stroke-width="1.6"/>
            <line x1="635" y1="400" x2="635" y2="445" stroke="#000000" stroke-width="1.4"/>
            <text x="612" y="427" text-anchor="middle" font-weight="bold" font-size="12" fill="#000000">D3</text>
            <text x="692" y="427" text-anchor="middle" font-size="11.5" fill="#000000">Borrow Requests Store</text>
          </g>

          <g id="store-d4">
            <path d="M 750 580 L 590 580 L 590 625 L 750 625" fill="none" stroke="#000000" stroke-width="1.6"/>
            <line x1="635" y1="580" x2="635" y2="625" stroke="#000000" stroke-width="1.4"/>
            <text x="612" y="607" text-anchor="middle" font-weight="bold" font-size="12" fill="#000000">D4</text>
            <text x="692" y="607" text-anchor="middle" font-size="11.5" fill="#000000">Access Tokens Store</text>
          </g>

          <g id="store-d5">
            <path d="M 750 870 L 590 870 L 590 915 L 750 915" fill="none" stroke="#000000" stroke-width="1.6"/>
            <line x1="635" y1="870" x2="635" y2="915" stroke="#000000" stroke-width="1.4"/>
            <text x="612" y="897" text-anchor="middle" font-weight="bold" font-size="12" fill="#000000">D5</text>
            <text x="692" y="897" text-anchor="middle" font-size="11.5" fill="#000000">Circulation Logs Store</text>
          </g>

          <!-- Lines -->
          <line x1="170" y1="130" x2="340" y2="130" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="255" y="123" text-anchor="middle" font-size="9.5" fill="#000000">Credentials &amp; Institutional ID</text>

          <line x1="340" y1="150" x2="170" y2="150" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="255" y="163" text-anchor="middle" font-size="9.5" fill="#000000">Auth Token &amp; User Profile</text>

          <line x1="510" y1="125" x2="590" y2="125" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="550" y="118" text-anchor="middle" font-size="9" fill="#000000">Save User</text>

          <line x1="590" y1="145" x2="510" y2="145" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="550" y="158" text-anchor="middle" font-size="9" fill="#000000">Read Record</text>

          <line x1="170" y1="265" x2="340" y2="265" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="255" y="258" text-anchor="middle" font-size="9.5" fill="#000000">Search Query &amp; School Filters</text>

          <line x1="340" y1="285" x2="170" y2="285" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="255" y="298" text-anchor="middle" font-size="9.5" fill="#000000">Holding Status &amp; Shelf Loc</text>

          <line x1="510" y1="265" x2="590" y2="265" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="550" y="258" text-anchor="middle" font-size="9" fill="#000000">Update Stock</text>

          <line x1="590" y1="285" x2="510" y2="285" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="550" y="298" text-anchor="middle" font-size="9" fill="#000000">Read Holdings</text>

          <path d="M 130 300 L 130 420 L 340 420" fill="none" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="235" y="413" text-anchor="middle" font-size="9.5" fill="#000000">Submit Inter-Library Borrow Request</text>

          <line x1="170" y1="510" x2="340" y2="445" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="255" y="475" text-anchor="middle" font-size="9.5" fill="#000000">Approval / Rejection Decision</text>

          <line x1="340" y1="460" x2="170" y2="530" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="255" y="520" text-anchor="middle" font-size="9.5" fill="#000000">Pending Requests Queue</text>

          <line x1="510" y1="415" x2="590" y2="415" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="550" y="408" text-anchor="middle" font-size="9" fill="#000000">Save Request</text>

          <line x1="590" y1="435" x2="510" y2="435" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="550" y="448" text-anchor="middle" font-size="9" fill="#000000">Read Queue</text>

          <line x1="425" y1="465" x2="425" y2="580" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="495" y="525" text-anchor="middle" font-size="9.5" fill="#000000">Approved Request State</text>

          <line x1="510" y1="595" x2="590" y2="595" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="550" y="588" text-anchor="middle" font-size="9" fill="#000000">Store Token</text>

          <line x1="590" y1="615" x2="510" y2="615" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="550" y="628" text-anchor="middle" font-size="9" fill="#000000">Verify Expiry</text>

          <line x1="510" y1="605" x2="960" y2="605" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="850" y="598" text-anchor="middle" font-size="9.5" fill="#000000">Send Token Pass &amp; Instructions</text>

          <path d="M 340 620 L 105 620 L 105 300" fill="none" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="215" y="635" text-anchor="middle" font-size="9.5" fill="#000000">Issued Digital Access Token Pass (QR)</text>

          <line x1="960" y1="760" x2="510" y2="760" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="820" y="753" text-anchor="middle" font-size="9.5" fill="#000000">Input / Scan QR Token at Counter</text>

          <line x1="510" y1="785" x2="960" y2="785" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="820" y="798" text-anchor="middle" font-size="9.5" fill="#000000">Valid Token, Student Details &amp; Dispense Confirmation</text>

          <line x1="425" y1="805" x2="425" y2="870" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="495" y="840" text-anchor="middle" font-size="9.5" fill="#000000">Circulation Event Log</text>

          <line x1="510" y1="885" x2="590" y2="885" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="550" y="878" text-anchor="middle" font-size="9" fill="#000000">Save Audit</text>

          <line x1="590" y1="905" x2="510" y2="905" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="550" y="918" text-anchor="middle" font-size="9" fill="#000000">Read Logs</text>

          <path d="M 510 920 L 1040 920 L 1040 195" fill="none" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="880" y="935" text-anchor="middle" font-size="9.5" fill="#000000">System Performance, Fines &amp; Circulation Analytics</text>

          <path d="M 970 140 L 510 140" fill="none" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow-dfd1)"/>
          <text x="800" y="133" text-anchor="middle" font-size="9.5" fill="#000000">User Account Roles &amp; Sanctions</text>
        </svg>
  `;
}

// Assemble full HTML
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LibraLink - Complete Manuscript Diagrams Suite</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --border: #cbd5e1;
      --primary: #1e293b;
      --accent: #2563eb;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      max-width: 1400px;
      margin: 0 auto 20px auto;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 16px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
    }
    .header p {
      font-size: 13px;
      color: #64748b;
    }
    .tabs-nav {
      max-width: 1400px;
      margin: 0 auto 24px auto;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      background: #e2e8f0;
      padding: 6px;
      border-radius: 10px;
    }
    .tab-btn {
      border: none;
      background: transparent;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .tab-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .tab-btn.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .diagram-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 36px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.04);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }
    .card-desc {
      font-size: 13px;
      color: #64748b;
    }
    .btn-group {
      display: flex;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .btn-copy {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }
    .btn-copy:hover {
      background: #1d4ed8;
      color: #ffffff;
    }
    .btn-primary {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }
    .btn-primary:hover {
      background: #1e293b;
      color: #ffffff;
    }
    .sprint-badge {
      display: inline-block;
      padding: 3px 10px;
      font-size: 13px;
      font-weight: 800;
      border-radius: 4px;
      margin-right: 8px;
      letter-spacing: 0.5px;
      color: #ffffff;
    }
    .sprint-badge.sprint-1 { background: #0284c7; }
    .sprint-badge.sprint-2 { background: #d97706; }
    .sprint-badge.sprint-3 { background: #059669; }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.22);
      font-size: 14px;
      font-weight: 600;
      display: none;
      z-index: 99999;
      animation: fadeIn 0.2s ease-in-out;
    }
    .toast.show {
      display: block;
    }
    .toast.error {
      background: #dc2626;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .svg-wrapper {
      display: flex;
      justify-content: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      overflow-x: auto;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <h1>LibraLink — Complete Official Manuscript Diagrams Suite</h1>
      <p>Standard UML 2.5 &amp; Gane-Sarson DFD Specifications for Chapter 4 (System Design &amp; Development)</p>
    </div>
    <div>
      <button class="btn btn-primary" onclick="exportAllPngs()">⚡ Export All PNGs for Manuscript</button>
    </div>
  </div>

  <div class="tabs-nav">
    <button class="tab-btn active" onclick="switchTab('all')">Show All Diagrams</button>
    <button class="tab-btn" onclick="switchTab('auth')">Fig 4.0: Login &amp; Auth (4 Roles)</button>
    <button class="tab-btn" onclick="switchTab('usecase')">Fig 4.10: Complete Use Case (4 Roles)</button>
    <button class="tab-btn" onclick="switchTab('arch')">Fig 4.8: System Architecture</button>
    <button class="tab-btn" onclick="switchTab('flow')">Fig 4.9: System Flowchart</button>
    <button class="tab-btn" onclick="switchTab('erd')">Fig 4.13: Entity-Relationship (ERD)</button>
    <button class="tab-btn" onclick="switchTab('nav')">Fig 4.15: Navigation Structure</button>
    <button class="tab-btn" onclick="switchTab('dfd0')">Fig 4.11: DFD Level 0 (Context)</button>
    <button class="tab-btn" onclick="switchTab('dfd1')">Fig 4.12: DFD Level 1 (Exploded)</button>
    <button class="tab-btn" onclick="switchTab('sprint1')" style="color:#0284c7;font-weight:700;">⚡ SPRINT 1 (Fig 4.1)</button>
    <button class="tab-btn" onclick="switchTab('sprint2')" style="color:#d97706;font-weight:700;">⚡ SPRINT 2 (Fig 4.2)</button>
    <button class="tab-btn" onclick="switchTab('sprint3')" style="color:#059669;font-weight:700;">⚡ SPRINT 3 (Fig 4.3)</button>
  </div>

  <div class="container">

    <!-- 0.0. FIGURE 4.0 LOGIN & AUTHENTICATION USE CASE -->
    <div class="diagram-card" id="card-auth">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.0: User Authentication &amp; RBAC Access Control Use Case Diagram</div>
          <div class="card-desc">UML 2.5 Specification for Campus Selection, Registration, OTP Verification, Login with Password Hash, Password Recovery, and Role-Based Redirection Across All 4 User Types</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-auth', 1380, 980)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-auth', 'Figure_4_0_User_Authentication_Use_Case_Diagram.png', 1380, 980)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-auth', 'Figure_4_0_User_Authentication_Use_Case_Diagram.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-auth')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getAuthUseCaseSvg()}
      </div>
    </div>

    <!-- 0. FIGURE 4.8 SYSTEM ARCHITECTURE -->
    <div class="diagram-card" id="card-arch">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.8: Overall System Architecture Model of LibraLink</div>
          <div class="card-desc">Three-Tier Layered Client-Server Architecture (Presentation Tier, API Logic Tier, PostgreSQL &amp; Cloud Persistence Tier)</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-arch', 1180, 950)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-arch', 'Figure_4_8_Overall_System_Architecture.png', 1180, 950)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-arch', 'Figure_4_8_Overall_System_Architecture.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-arch')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getArchitectureSvg()}
      </div>
    </div>

    <!-- 0.5. FIGURE 4.9 OPERATIONAL SYSTEM FLOWCHART -->
    <div class="diagram-card" id="card-flow">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.9: LibraLink Operational System Flowchart</div>
          <div class="card-desc">End-to-End Operational Lifecycle Across 4 Roles: Student, Home Librarian, Partner Librarian, and Administrator (Sprint 1 to 3 Workflows)</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-flowchart', 1260, 1520)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-flowchart', 'Figure_4_9_System_Flow_Diagram.png', 1260, 1520)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-flowchart', 'Figure_4_9_System_Flow_Diagram.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-flowchart')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getFlowchartSvg()}
      </div>
    </div>

    <!-- 0.7. FIGURE 4.10 COMPLETE USE CASE DIAGRAM (4 ROLES) -->
    <div class="diagram-card" id="card-usecase">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.10: Complete LibraLink Actor-to-Use-Case Interaction Diagram</div>
          <div class="card-desc">UML 2.5 Specification Encompassing All Four (4) Institutional User Roles: Students, Librarian, Admin-Librarian, and Super Admin</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-complete-usecase', 1520, 1560)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-complete-usecase', 'Figure_4_10_Complete_Actor_to_Use_Case_Diagram.png', 1520, 1560)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-complete-usecase', 'Figure_4_10_Complete_Actor_to_Use_Case_Diagram.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-complete-usecase')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getCompleteUseCaseSvg()}
      </div>
    </div>

    <!-- 1. FIGURE 4.13 ERD -->
    <div class="diagram-card" id="card-erd">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.13: Entity-Relationship Diagram (ERD) of LibraLink</div>
          <div class="card-desc">Relational Data Model with Exact dbdiagram.io One-to-Many Crow's Foot &amp; Crossbar Connectors</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-erd', 1420, 980)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-erd', 'Figure_4_13_Entity_Relationship_Diagram_ERD.png', 1420, 980)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-erd', 'Figure_4_13_Entity_Relationship_Diagram_ERD.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-erd')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getERDSvg()}
      </div>
    </div>

    <!-- 2. FIGURE 4.15 NAVIGATION STRUCTURE -->
    <div class="diagram-card" id="card-nav">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.15: Librarian Scoped Navigation Structure of LibraLink</div>
          <div class="card-desc">System Navigation &amp; Site Map Hierarchy: Login, Dashboard, Circulation Desk, Request Inbox, Catalog Inventory, and Session Management</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-nav', 980, 840)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-nav', 'Figure_4_15_Librarian_Navigation_Structure.png', 980, 840)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-nav', 'Figure_4_15_Librarian_Navigation_Structure.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-nav')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getNavSvg()}
      </div>
    </div>

    <!-- 3. FIGURE 4.11 DFD LEVEL 0 (CONTEXT) -->
    <div class="diagram-card" id="card-dfd0">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.11: Context Diagram Level 0 (DFD Level 0)</div>
          <div class="card-desc">High-Level Contextual Boundaries, External Entities, and Core Data Flows</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-dfd0', 1100, 920)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-dfd0', 'Figure_4_11_DFD_Level_0_Context_Diagram.png', 1100, 920)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-dfd0', 'Figure_4_11_DFD_Level_0_Context_Diagram.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-dfd0')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getDfd0Svg()}
      </div>
    </div>

    <!-- 4. FIGURE 4.12 DFD LEVEL 1 (EXPLODED) -->
    <div class="diagram-card" id="card-dfd1">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.12: Level 1 Data Flow Diagram (DFD Level 1) of LibraLink</div>
          <div class="card-desc">Exploded Subsystem Processes (1.0 to 6.0), Data Stores (D1 to D5), and Structured Data Flows</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-dfd1', 1150, 1020)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-dfd1', 'Figure_4_12_DFD_Level_1_Exploded_Processes.png', 1150, 1020)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-dfd1', 'Figure_4_12_DFD_Level_1_Exploded_Processes.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-dfd1')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getDfd1Svg()}
      </div>
    </div>

    <!-- 5. FIGURE 4.1 SPRINT 1 USE CASE -->
    <div class="diagram-card" id="card-sprint1">
      <div class="card-top">
        <div>
          <div class="card-title"><span class="sprint-badge sprint-1">SPRINT 1</span> Figure 4.1: Cross-School Catalog Search &amp; Holdings Indexing Use Case Diagram</div>
          <div class="card-desc">Sprint 1 Scope: Cross-School Discovery &amp; OPAC Holdings Indexing Encompassing All 4 User Types (Students, Librarian, Admin-Librarian, Super Admin) with Institutional Login</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-sprint1', 1320, 920)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-sprint1', 'Figure_4_1_Sprint_1_Use_Case_Diagram.png', 1320, 920)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-sprint1', 'Figure_4_1_Sprint_1_Use_Case_Diagram.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-sprint1')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getSprint1Svg()}
      </div>
    </div>

    <!-- 6. FIGURE 4.2 SPRINT 2 USE CASE -->
    <div class="diagram-card" id="card-sprint2">
      <div class="card-top">
        <div>
          <div class="card-title"><span class="sprint-badge sprint-2">SPRINT 2</span> Figure 4.2: Inter-Library Request Routing &amp; Digital Access Token Use Case Diagram</div>
          <div class="card-desc">Sprint 2 Scope: Inter-Library Request Routing &amp; 72-Hour Digital Access Pass Encompassing All 4 User Types with Institutional Login</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-sprint2', 1320, 920)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-sprint2', 'Figure_4_2_Sprint_2_Use_Case_Diagram.png', 1320, 920)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-sprint2', 'Figure_4_2_Sprint_2_Use_Case_Diagram.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-sprint2')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getSprint2Svg()}
      </div>
    </div>

    <!-- 7. FIGURE 4.3 SPRINT 3 USE CASE -->
    <div class="diagram-card" id="card-sprint3">
      <div class="card-top">
        <div>
          <div class="card-title"><span class="sprint-badge sprint-3">SPRINT 3</span> Figure 4.3: Physical Circulation Counter, Optical Verification &amp; Audit Logs Use Case Diagram</div>
          <div class="card-desc">Sprint 3 Scope: Physical Circulation Counter, Optical QR Token Verification &amp; Audit Logs Encompassing All 4 User Types with Institutional Login</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-copy" onclick="copyPngToClipboard('svg-sprint3', 1320, 940)">📋 Copy Image (Ctrl+V)</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-sprint3', 'Figure_4_3_Sprint_3_Use_Case_Diagram.png', 1320, 940)">🖼 Download High-Res PNG</button>
          <button class="btn" onclick="downloadSvg('svg-sprint3', 'Figure_4_3_Sprint_3_Use_Case_Diagram.svg')">⬇ Download SVG</button>
          <button class="btn" onclick="copySvg('svg-sprint3')">📋 Copy SVG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${getSprint3Svg()}
      </div>
    </div>

  </div>

  <div id="toast" class="toast"></div>

  <script>
    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      const cards = {
        auth: document.getElementById('card-auth'),
        usecase: document.getElementById('card-usecase'),
        arch: document.getElementById('card-arch'),
        flow: document.getElementById('card-flow'),
        erd: document.getElementById('card-erd'),
        nav: document.getElementById('card-nav'),
        dfd0: document.getElementById('card-dfd0'),
        dfd1: document.getElementById('card-dfd1'),
        sprint1: document.getElementById('card-sprint1'),
        sprint2: document.getElementById('card-sprint2'),
        sprint3: document.getElementById('card-sprint3'),
      };

      if (tab === 'all') {
        Object.values(cards).forEach(c => c.style.display = 'block');
        event.target.classList.add('active');
      } else {
        Object.keys(cards).forEach(key => {
          cards[key].style.display = (key === tab) ? 'block' : 'none';
        });
        event.target.classList.add('active');
      }
    }

    function showToast(msg, isError = false) {
      let toast = document.getElementById('toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
      }
      toast.innerText = msg;
      toast.className = 'toast show' + (isError ? ' error' : '');
      setTimeout(() => {
        toast.className = 'toast';
      }, 4000);
    }

    function copyPngToClipboard(svgId, width, height) {
      const svg = document.getElementById(svgId);
      if (!svg) {
        showToast('❌ SVG element not found!', true);
        return;
      }
      showToast('⏳ Rendering diagram image to clipboard...');

      try {
        const svgStr = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const scale = 2.5; // High 300 DPI sharpness for Microsoft Word
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = function() {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);

          canvas.toBlob(function(blob) {
            if (!blob) {
              showToast('❌ Failed to convert diagram to image', true);
              return;
            }
            if (navigator.clipboard && navigator.clipboard.write) {
              navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]).then(() => {
                showToast('✅ Image copied to clipboard! (Press Ctrl + V in Word)');
              }).catch(err => {
                console.error('Clipboard write error:', err);
                showToast('⚠️ Clipboard write blocked. Downloading PNG instead...', true);
                downloadPng(svgId, svgId + '.png', width, height);
              });
            } else {
              showToast('⚠️ Clipboard API not supported. Downloading PNG instead...', true);
              downloadPng(svgId, svgId + '.png', width, height);
            }
          }, 'image/png');
        };
        img.onerror = function() {
          showToast('❌ Failed to load SVG as image', true);
        };
        img.src = url;
      } catch (err) {
        console.error(err);
        showToast('❌ Error copying image: ' + err.message, true);
      }
    }

    function copySvg(svgId) {
      const svg = document.getElementById(svgId);
      const str = new XMLSerializer().serializeToString(svg);
      navigator.clipboard.writeText(str).then(() => {
        showToast('✅ SVG XML copied to clipboard!');
      }).catch(err => {
        console.error(err);
        showToast('❌ Failed to copy SVG XML', true);
      });
    }

    function downloadSvg(svgId, filename) {
      const svg = document.getElementById(svgId);
      const str = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('⬇ Downloading SVG: ' + filename);
    }

    function downloadPng(svgId, filename, width, height) {
      const svg = document.getElementById(svgId);
      const svgStr = new XMLSerializer().serializeToString(svg);
      
      const canvas = document.createElement('canvas');
      const scale = 2.5; // High 300 DPI sharpness
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = function() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        
        canvas.toBlob(function(blob) {
          const pngUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(pngUrl);
          showToast('⬇ Downloading PNG: ' + filename);
        }, 'image/png');
      };
      img.src = url;
    }

    function exportAllPngs() {
      showToast('⚡ Exporting all 11 manuscript diagrams as PNGs...');
      downloadPng('svg-auth', 'Figure_4_0_User_Authentication_Use_Case_Diagram.png', 1380, 980);
      setTimeout(() => downloadPng('svg-complete-usecase', 'Figure_4_10_Complete_Actor_to_Use_Case_Diagram.png', 1520, 1560), 250);
      setTimeout(() => downloadPng('svg-arch', 'Figure_4_8_Overall_System_Architecture.png', 1180, 950), 500);
      setTimeout(() => downloadPng('svg-flowchart', 'Figure_4_9_System_Flow_Diagram.png', 1260, 1520), 750);
      setTimeout(() => downloadPng('svg-erd', 'Figure_4_13_Entity_Relationship_Diagram_ERD.png', 1420, 980), 1000);
      setTimeout(() => downloadPng('svg-nav', 'Figure_4_15_Librarian_Navigation_Structure.png', 980, 840), 1250);
      setTimeout(() => downloadPng('svg-dfd0', 'Figure_4_11_DFD_Level_0_Context_Diagram.png', 1100, 920), 1500);
      setTimeout(() => downloadPng('svg-dfd1', 'Figure_4_12_DFD_Level_1_Exploded_Processes.png', 1150, 1020), 1750);
      setTimeout(() => downloadPng('svg-sprint1', 'Figure_4_1_Sprint_1_Use_Case_Diagram.png', 1320, 920), 2000);
      setTimeout(() => downloadPng('svg-sprint2', 'Figure_4_2_Sprint_2_Use_Case_Diagram.png', 1320, 920), 2250);
      setTimeout(() => downloadPng('svg-sprint3', 'Figure_4_3_Sprint_3_Use_Case_Diagram.png', 1320, 940), 2500);
    }
  </script>
</body>
</html>
`;

fs.writeFileSync('docs/complete_manuscript_diagrams_suite.html', fullHtml, 'utf8');
console.log('Rebuilt docs/complete_manuscript_diagrams_suite.html with all 7 diagrams successfully!');
