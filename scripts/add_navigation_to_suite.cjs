const fs = require('fs');

function generateNavSvg() {
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
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- Title at top matching SaloPorac format -->
          <text x="30" y="35" font-weight="bold" font-size="16" fill="#000000">Figure 4.15</text>
          <text x="30" y="55" font-style="italic" font-size="14" fill="#333333">Librarian Scoped Navigation Structure of LibraLink</text>

          <!-- ============================================== -->
          <!-- CONNECTING WIRES & ARROWS                      -->
          <!-- ============================================== -->
          <g id="nav-lines" stroke="#475569" stroke-width="1.5" fill="none">
            <!-- 1. LOGIN -> DASHBOARD -->
            <line x1="470" y1="135" x2="560" y2="135" marker-end="url(#nav-arrow)"/>

            <!-- 2. DASHBOARD -> Branch to 3 Columns -->
            <path d="M 650 170 L 650 205 L 230 205 L 230 250" marker-end="url(#nav-arrow)"/>
            <path d="M 650 205 L 505 205 L 505 250" marker-end="url(#nav-arrow)"/>
            <path d="M 650 205 L 780 205 L 780 250" marker-end="url(#nav-arrow)"/>

            <!-- 3. Column 1 Wires (Vertical) -->
            <line x1="230" y1="320" x2="230" y2="365" marker-end="url(#nav-arrow)"/>
            <line x1="230" y1="435" x2="230" y2="480" marker-end="url(#nav-arrow)"/>
            <!-- Col 1 bottom to Core Functions -->
            <path d="M 230 550 L 230 630 L 290 630" marker-end="url(#nav-arrow)"/>

            <!-- 4. Column 2 Wires (Vertical) -->
            <line x1="505" y1="320" x2="505" y2="365" marker-end="url(#nav-arrow)"/>
            <!-- Col 2 bottom to Core Functions -->
            <line x1="505" y1="435" x2="505" y2="595" marker-end="url(#nav-arrow)"/>

            <!-- 5. Column 3 Wires (Vertical) -->
            <line x1="780" y1="320" x2="780" y2="365" marker-end="url(#nav-arrow)"/>
            <!-- Col 3 bottom to Core Functions -->
            <path d="M 780 435 L 780 630 L 720 630" marker-end="url(#nav-arrow)"/>

            <!-- 6. CORE FUNCTIONS -> LOGOUT -->
            <line x1="505" y1="665" x2="505" y2="715" marker-end="url(#nav-arrow)"/>

            <!-- 7. LOGOUT -> Back to LOGIN Loop -->
            <path d="M 415 750 L 95 750 L 95 135 L 290 135" marker-end="url(#nav-arrow)"/>
          </g>


          <!-- ============================================== -->
          <!-- TOP ROW: LOGIN & DASHBOARD                     -->
          <!-- ============================================== -->

          <!-- LOGIN (Lavender / Soft Purple) -->
          <g id="node-login" filter="url(#nav-shadow)">
            <rect x="290" y="100" width="180" height="70" rx="12" ry="12" fill="#e9d5ff" stroke="#a855f7" stroke-width="1.6"/>
            <!-- Lock Icon -->
            <rect x="372" y="112" width="16" height="12" rx="2" fill="#7e22ce"/>
            <path d="M 375 112 L 375 107 C 375 104, 385 104, 385 107 L 385 112" fill="none" stroke="#7e22ce" stroke-width="2"/>
            <text x="380" y="140" text-anchor="middle" font-weight="bold" font-size="13" fill="#581c87">LOGIN</text>
            <text x="380" y="156" text-anchor="middle" font-size="11" fill="#7e22ce">(Authentication)</text>
          </g>

          <!-- DASHBOARD (Soft Light Green) -->
          <g id="node-dashboard" filter="url(#nav-shadow)">
            <rect x="560" y="100" width="180" height="70" rx="12" ry="12" fill="#dcfce7" stroke="#22c55e" stroke-width="1.6"/>
            <!-- Analytics Icon -->
            <rect x="642" y="118" width="4" height="8" fill="#15803d"/>
            <rect x="648" y="114" width="4" height="12" fill="#15803d"/>
            <rect x="654" y="110" width="4" height="16" fill="#15803d"/>
            <text x="650" y="140" text-anchor="middle" font-weight="bold" font-size="13" fill="#14532d">DASHBOARD</text>
            <text x="650" y="156" text-anchor="middle" font-size="11" fill="#15803d">(Overview)</text>
          </g>


          <!-- ============================================== -->
          <!-- THREE COLUMNS                                  -->
          <!-- ============================================== -->

          <!-- COLUMN 1: CIRCULATION DESK (Light Green) -->
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


          <!-- COLUMN 2: BORROW REQUESTS (Light Blue) -->
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


          <!-- COLUMN 3: CATALOG & INVENTORY (Soft Lavender/Purple) -->
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


          <!-- ============================================== -->
          <!-- CONVERGENCE: LIBRARIAN CORE FUNCTIONS          -->
          <!-- ============================================== -->
          <g id="node-core" filter="url(#nav-shadow)">
            <rect x="290" y="595" width="430" height="70" rx="12" ry="12" fill="#e2e8f0" stroke="#64748b" stroke-width="1.6"/>
            <!-- Gear Icon -->
            <circle cx="370" cy="630" r="7" fill="#475569"/>
            <circle cx="370" cy="630" r="3" fill="#e2e8f0"/>
            <path d="M 370 619 L 370 622 M 370 638 L 370 641 M 359 630 L 362 630 M 378 630 L 381 630" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
            <text x="515" y="626" text-anchor="middle" font-weight="bold" font-size="13" fill="#1e293b">LIBRARIAN CORE FUNCTIONS</text>
            <text x="515" y="644" text-anchor="middle" font-size="11" fill="#475569">(Consortium Operations &amp; Circulation Desk)</text>
          </g>


          <!-- ============================================== -->
          <!-- LOGOUT (END)                                   -->
          <!-- ============================================== -->
          <g id="node-logout" filter="url(#nav-shadow)">
            <rect x="415" y="715" width="180" height="65" rx="12" ry="12" fill="#fecaca" stroke="#ef4444" stroke-width="1.6"/>
            <text x="505" y="744" text-anchor="middle" font-weight="bold" font-size="13" fill="#991b1b">LOGOUT</text>
            <text x="505" y="762" text-anchor="middle" font-size="11" fill="#dc2626">(END SESSION)</text>
          </g>

        </svg>
  `;
}

// Read complete_manuscript_diagrams_suite.html
const filePath = 'docs/complete_manuscript_diagrams_suite.html';
let html = fs.readFileSync(filePath, 'utf8');

// Build the Navigation card HTML
const navSvg = generateNavSvg();
const navCard = `
    <!-- ======================================================= -->
    <!-- DIAGRAM: FIGURE 4.15 LIBRARIAN NAVIGATION STRUCTURE     -->
    <!-- Matching User Uploaded Reference Image (SaloPorac 4.8c) -->
    <!-- ======================================================= -->
    <div class="diagram-card" id="card-nav">
      <div class="card-top">
        <div>
          <div class="card-title">Figure 4.15: Librarian Scoped Navigation Structure of LibraLink</div>
          <div class="card-desc">System Navigation &amp; Site Map Hierarchy: Login, Dashboard, Circulation Desk, Request Inbox, Catalog Inventory, and Session Management</div>
        </div>
        <div class="btn-group">
          <button class="btn" onclick="copySvg('svg-nav')">📋 Copy SVG</button>
          <button class="btn" onclick="downloadSvg('svg-nav', 'Figure_4_15_Librarian_Navigation_Structure.svg')">⬇ Download SVG</button>
          <button class="btn btn-primary" onclick="downloadPng('svg-nav', 'Figure_4_15_Librarian_Navigation_Structure.png', 980, 840)">🖼 Download High-Res PNG</button>
        </div>
      </div>
      <div class="svg-wrapper">
${navSvg}
      </div>
    </div>
`;

// Insert Nav card after card-erd
if (!html.includes('id="card-nav"')) {
  html = html.replace('<div class="diagram-card" id="card-dfd0">', navCard + '\n    <div class="diagram-card" id="card-dfd0">');
}

// Add tab button in tabs-nav
if (!html.includes('switchTab(\'nav\')')) {
  html = html.replace(
    '<button class="tab-btn" onclick="switchTab(\'erd\')">Figure 4.13: Entity-Relationship (ERD)</button>',
    '<button class="tab-btn" onclick="switchTab(\'erd\')">Figure 4.13: Entity-Relationship (ERD)</button>\n    <button class="tab-btn" onclick="switchTab(\'nav\')">Figure 4.15: Navigation Structure</button>'
  );
}

// Update switchTab cards mapping
if (!html.includes('nav: document.getElementById(\'card-nav\')')) {
  html = html.replace('erd: document.getElementById(\'card-erd\'),', 'erd: document.getElementById(\'card-erd\'),\n        nav: document.getElementById(\'card-nav\'),');
}

// Update exportAllPngs to also export Nav PNG
if (!html.includes('Figure_4_15_Librarian_Navigation_Structure.png')) {
  html = html.replace(
    'downloadPng(\'svg-erd\', \'Figure_4_13_Entity_Relationship_Diagram_ERD.png\', 1420, 980);',
    'downloadPng(\'svg-erd\', \'Figure_4_13_Entity_Relationship_Diagram_ERD.png\', 1420, 980);\n      setTimeout(() => downloadPng(\'svg-nav\', \'Figure_4_15_Librarian_Navigation_Structure.png\', 980, 840), 200);'
  );
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('Successfully added Navigation Structure to docs/complete_manuscript_diagrams_suite.html!');
