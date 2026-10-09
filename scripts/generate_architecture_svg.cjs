const fs = require('fs');

function getArchitectureSvg() {
  const width = 1100;
  const height = 880;

  return `
  <svg id="svg-arch" viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
    <defs>
      <!-- Black Arrowhead Markers -->
      <marker id="arch-arrow-down" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
      </marker>
      <marker id="arch-arrow-up" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill="#000000" />
      </marker>
    </defs>

    <!-- Header Block (Academic Format) -->
    <g transform="translate(50, 24)">
      <!-- Black Figure Badge -->
      <rect x="0" y="0" width="100" height="26" rx="4" fill="#000000" />
      <text x="50" y="18" fill="#ffffff" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="0.5">Figure 4.8</text>
      
      <!-- Academic Title & Subtitle -->
      <text x="115" y="19" fill="#000000" font-size="17" font-weight="700">Overall System Architecture Model of LibraLink</text>
      <text x="115" y="38" fill="#555555" font-size="12" font-weight="500">Three-Tier Layered Client-Server Architecture &amp; Distributed Cloud Persistence</text>
    </g>

    <!-- ======================================================== -->
    <!-- TIER 1: PRESENTATION LAYER (CLIENT-SIDE VIEWPORTS)       -->
    <!-- ======================================================== -->
    <g transform="translate(50, 78)">
      <!-- Outer Container -->
      <rect x="0" y="0" width="1000" height="175" rx="6" fill="#fcfcfc" stroke="#000000" stroke-width="1.8" />
      
      <!-- Header Strip -->
      <path d="M 0 6 Q 0 0 6 0 L 994 0 Q 1000 0 1000 6 L 1000 34 L 0 34 Z" fill="#000000" />
      <text x="18" y="22" fill="#ffffff" font-size="12.5" font-weight="700" letter-spacing="0.5">PRESENTATION TIER (CLIENT-SIDE VIEWPORTS)</text>
      <text x="982" y="22" fill="#e5e5e5" font-size="11.5" font-weight="600" text-anchor="end">React 19 • Vite • Tailwind CSS • Responsive SPA</text>

      <!-- Sub-Card 1: Student Web Portal -->
      <g transform="translate(18, 48)">
        <rect x="0" y="0" width="305" height="112" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.3" />
        <rect x="0" y="0" width="305" height="26" rx="4" fill="#f3f4f6" stroke="#000000" stroke-width="1.3" />
        <text x="12" y="18" fill="#000000" font-size="12.5" font-weight="700">Student Web Portal</text>
        <text x="293" y="18" fill="#555555" font-size="10.5" font-weight="600" text-anchor="end">Web / Mobile</text>
        
        <circle cx="16" cy="43" r="2.5" fill="#000000" />
        <text x="26" y="47" fill="#222222" font-size="11">Cross-School Catalog Search Interface</text>
        
        <circle cx="16" cy="63" r="2.5" fill="#000000" />
        <text x="26" y="67" fill="#222222" font-size="11">Inter-Library Borrow Request Submission</text>
        
        <circle cx="16" cy="83" r="2.5" fill="#000000" />
        <text x="26" y="87" fill="#222222" font-size="11">Digital Access Token Pass (QR View)</text>
        
        <text x="12" y="103" fill="#666666" font-size="10" font-style="italic">Supported: Smartphone, Tablet &amp; PC</text>
      </g>

      <!-- Sub-Card 2: Librarian Administrative Desk -->
      <g transform="translate(347, 48)">
        <rect x="0" y="0" width="305" height="112" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.3" />
        <rect x="0" y="0" width="305" height="26" rx="4" fill="#f3f4f6" stroke="#000000" stroke-width="1.3" />
        <text x="12" y="18" fill="#000000" font-size="12.5" font-weight="700">Librarian Administrative Desk</text>
        <text x="293" y="18" fill="#555555" font-size="10.5" font-weight="600" text-anchor="end">Circulation</text>
        
        <circle cx="16" cy="43" r="2.5" fill="#000000" />
        <text x="26" y="47" fill="#222222" font-size="11">Dual Approval Inboxes (Home &amp; Partner)</text>
        
        <circle cx="16" cy="63" r="2.5" fill="#000000" />
        <text x="26" y="67" fill="#222222" font-size="11">Optical Barcode &amp; QR Code Scanner</text>
        
        <circle cx="16" cy="83" r="2.5" fill="#000000" />
        <text x="26" y="87" fill="#222222" font-size="11">Book Holdings &amp; Circulation Records</text>
        
        <text x="12" y="103" fill="#666666" font-size="10" font-style="italic">Supported: Desktop PC &amp; Tablet Counter</text>
      </g>

      <!-- Sub-Card 3: Institutional Governance Panel -->
      <g transform="translate(676, 48)">
        <rect x="0" y="0" width="305" height="112" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.3" />
        <rect x="0" y="0" width="305" height="26" rx="4" fill="#f3f4f6" stroke="#000000" stroke-width="1.3" />
        <text x="12" y="18" fill="#000000" font-size="12.5" font-weight="700">System Governance Panel</text>
        <text x="293" y="18" fill="#555555" font-size="10.5" font-weight="600" text-anchor="end">Super Admin</text>
        
        <circle cx="16" cy="43" r="2.5" fill="#000000" />
        <text x="26" y="47" fill="#222222" font-size="11">Multi-Tenant School Profiles &amp; Rules</text>
        
        <circle cx="16" cy="63" r="2.5" fill="#000000" />
        <text x="26" y="67" fill="#222222" font-size="11">Role-Based Access Control (RBAC 1-4)</text>
        
        <circle cx="16" cy="83" r="2.5" fill="#000000" />
        <text x="26" y="87" fill="#222222" font-size="11">Audit Trails &amp; Circulation Analytics</text>
        
        <text x="12" y="103" fill="#666666" font-size="10" font-style="italic">Supported: Administrator Workstation</text>
      </g>
    </g>

    <!-- ========================================================= -->
    <!-- CONNECTOR 1: Presentation Tier <-> Application Logic Tier -->
    <!-- ========================================================= -->
    <g transform="translate(550, 253)">
      <!-- Down arrow line -->
      <line x1="-140" y1="0" x2="-140" y2="65" stroke="#000000" stroke-width="1.6" stroke-dasharray="4,3" marker-end="url(#arch-arrow-down)" />
      <!-- Up arrow line -->
      <line x1="140" y1="65" x2="140" y2="0" stroke="#000000" stroke-width="1.6" stroke-dasharray="4,3" marker-end="url(#arch-arrow-up)" />

      <!-- Center Box Label -->
      <rect x="-190" y="16" width="380" height="34" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
      <text x="0" y="32" fill="#000000" font-size="11" font-weight="700" text-anchor="middle">HTTPS / TLS 1.3 SECURE REST API COMMUNICATION</text>
      <text x="0" y="44" fill="#555555" font-size="9.5" font-weight="500" text-anchor="middle">Encrypted JSON Payloads • HTTP Status Codes (200, 201, 400, 401, 404)</text>
    </g>

    <!-- ========================================================= -->
    <!-- TIER 2: APPLICATION & BUSINESS LOGIC TIER (API MIDDLEWARE)-->
    <!-- ========================================================= -->
    <g transform="translate(50, 318)">
      <!-- Outer Container -->
      <rect x="0" y="0" width="1000" height="210" rx="6" fill="#fcfcfc" stroke="#000000" stroke-width="1.8" />
      
      <!-- Header Strip -->
      <path d="M 0 6 Q 0 0 6 0 L 994 0 Q 1000 0 1000 6 L 1000 34 L 0 34 Z" fill="#000000" />
      <text x="18" y="22" fill="#ffffff" font-size="12.5" font-weight="700" letter-spacing="0.5">APPLICATION &amp; BUSINESS LOGIC TIER (API MIDDLEWARE)</text>
      <text x="982" y="22" fill="#e5e5e5" font-size="11.5" font-weight="600" text-anchor="end">Node.js Runtime • Express.js Engine • RESTful Architecture</text>

      <!-- 3 Streamlined Core Service Columns -->
      <!-- Column 1: Authentication & Access Security -->
      <g transform="translate(18, 48)">
        <rect x="0" y="0" width="305" height="146" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.3" />
        <rect x="0" y="0" width="305" height="26" rx="4" fill="#f3f4f6" stroke="#000000" stroke-width="1.3" />
        <text x="12" y="18" fill="#000000" font-size="12" font-weight="700">Authentication &amp; Access Security</text>
        <text x="293" y="18" fill="#555555" font-size="10" font-weight="600" text-anchor="end">/api/auth</text>
        
        <circle cx="16" cy="42" r="2.5" fill="#000000" />
        <text x="26" y="46" fill="#111111" font-size="11" font-weight="600">Role-Based Access Control (RBAC)</text>
        <text x="26" y="60" fill="#555555" font-size="10.5">Student, Staff, Librarian Admin, Super Admin</text>
        
        <circle cx="16" cy="80" r="2.5" fill="#000000" />
        <text x="26" y="84" fill="#111111" font-size="11" font-weight="600">JWT Token &amp; Password Hashing</text>
        <text x="26" y="98" fill="#555555" font-size="10.5">Bcrypt credential encryption &amp; session guards</text>
        
        <circle cx="16" cy="118" r="2.5" fill="#000000" />
        <text x="26" y="122" fill="#111111" font-size="11" font-weight="600">Institutional School Affiliation Gate</text>
        <text x="26" y="136" fill="#555555" font-size="10.5">Enforces home campus membership</text>
      </g>

      <!-- Column 2: Inter-Library Circulation & Token Engine -->
      <g transform="translate(347, 48)">
        <rect x="0" y="0" width="305" height="146" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.3" />
        <rect x="0" y="0" width="305" height="26" rx="4" fill="#f3f4f6" stroke="#000000" stroke-width="1.3" />
        <text x="12" y="18" fill="#000000" font-size="12" font-weight="700">Inter-Library Circulation Engine</text>
        <text x="293" y="18" fill="#555555" font-size="10" font-weight="600" text-anchor="end">/api/borrow-requests</text>
        
        <circle cx="16" cy="42" r="2.5" fill="#000000" />
        <text x="26" y="46" fill="#111111" font-size="11" font-weight="600">Dual-Approval State Machine</text>
        <text x="26" y="60" fill="#555555" font-size="10.5">Pending → Home Verify → Partner Grant</text>
        
        <circle cx="16" cy="80" r="2.5" fill="#000000" />
        <text x="26" y="84" fill="#111111" font-size="11" font-weight="600">Digital Access Token Generator</text>
        <text x="26" y="98" fill="#555555" font-size="10.5">Cryptographic 72-hr pass &amp; auto-expiry</text>
        
        <circle cx="16" cy="118" r="2.5" fill="#000000" />
        <text x="26" y="122" fill="#111111" font-size="11" font-weight="600">Circulation Check-in / Check-out</text>
        <text x="26" y="136" fill="#555555" font-size="10.5">QR optical redemption &amp; book handover</text>
      </g>

      <!-- Column 3: Catalog Query & Audit Logging Hub -->
      <g transform="translate(676, 48)">
        <rect x="0" y="0" width="305" height="146" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.3" />
        <rect x="0" y="0" width="305" height="26" rx="4" fill="#f3f4f6" stroke="#000000" stroke-width="1.3" />
        <text x="12" y="18" fill="#000000" font-size="12" font-weight="700">Catalog &amp; Audit Services</text>
        <text x="293" y="18" fill="#555555" font-size="10" font-weight="600" text-anchor="end">/api/books • /api/logs</text>
        
        <circle cx="16" cy="42" r="2.5" fill="#000000" />
        <text x="26" y="46" fill="#111111" font-size="11" font-weight="600">Cross-Campus Search &amp; Indexer</text>
        <text x="26" y="60" fill="#555555" font-size="10.5">Fuzzy title search &amp; partner holdings scan</text>
        
        <circle cx="16" cy="80" r="2.5" fill="#000000" />
        <text x="26" y="84" fill="#111111" font-size="11" font-weight="600">Real-Time Availability Checker</text>
        <text x="26" y="98" fill="#555555" font-size="10.5">Book copy tracking (Available, Reserved)</text>
        
        <circle cx="16" cy="118" r="2.5" fill="#000000" />
        <text x="26" y="122" fill="#111111" font-size="11" font-weight="600">System Transaction &amp; Audit Logger</text>
        <text x="26" y="136" fill="#555555" font-size="10.5">Immutable activity trail &amp; analytics</text>
      </g>
    </g>

    <!-- ========================================================= -->
    <!-- CONNECTOR 2: Application Tier <-> Data & Cloud Tier       -->
    <!-- ========================================================= -->
    <g transform="translate(0, 528)">
      <!-- Left arrow to Database -->
      <line x1="330" y1="0" x2="330" y2="65" stroke="#000000" stroke-width="1.6" stroke-dasharray="4,3" marker-end="url(#arch-arrow-down)" />
      <line x1="370" y1="65" x2="370" y2="0" stroke="#000000" stroke-width="1.6" stroke-dasharray="4,3" marker-end="url(#arch-arrow-up)" />
      
      <!-- Right arrow to External Services -->
      <line x1="820" y1="0" x2="820" y2="65" stroke="#000000" stroke-width="1.6" stroke-dasharray="4,3" marker-end="url(#arch-arrow-down)" />

      <!-- Left Badge -->
      <rect x="210" y="16" width="280" height="32" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.4" />
      <text x="350" y="31" fill="#000000" font-size="10.5" font-weight="700" text-anchor="middle">SSL CONNECTION POOL / SQL</text>
      <text x="350" y="43" fill="#555555" font-size="9" font-weight="500" text-anchor="middle">Supabase PostgreSQL Client • Relational ORM</text>

      <!-- Right Badge -->
      <rect x="700" y="16" width="240" height="32" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.4" />
      <text x="820" y="31" fill="#000000" font-size="10.5" font-weight="700" text-anchor="middle">EXTERNAL CLOUD APIS</text>
      <text x="820" y="43" fill="#555555" font-size="9" font-weight="500" text-anchor="middle">HTTPS Webhooks • Auth SDK • CDN</text>
    </g>

    <!-- ========================================================= -->
    <!-- TIER 3: DATA PERSISTENCE & EXTERNAL CLOUD SERVICES        -->
    <!-- ========================================================= -->
    <g transform="translate(50, 593)">
      <!-- Left Card: DATABASE & PERSISTENCE TIER (60% width) -->
      <g>
        <rect x="0" y="0" width="590" height="235" rx="6" fill="#fcfcfc" stroke="#000000" stroke-width="1.8" />
        <path d="M 0 6 Q 0 0 6 0 L 584 0 Q 590 0 590 6 L 590 34 L 0 34 Z" fill="#000000" />
        <text x="18" y="22" fill="#ffffff" font-size="12" font-weight="700" letter-spacing="0.5">DATA PERSISTENCE LAYER (CLOUD DATABASE)</text>
        <text x="572" y="22" fill="#e5e5e5" font-size="11" font-weight="600" text-anchor="end">Supabase Cloud • PostgreSQL DBMS</text>

        <!-- Sub-block 1: Tables -->
        <g transform="translate(18, 48)">
          <rect x="0" y="0" width="265" height="170" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.3" />
          <rect x="0" y="0" width="265" height="24" rx="4" fill="#f3f4f6" stroke="#000000" stroke-width="1.3" />
          <text x="10" y="16" fill="#000000" font-size="11.5" font-weight="700">Relational Database Tables</text>
          
          <circle cx="14" cy="40" r="2.2" fill="#000000" />
          <text x="22" y="44" fill="#222222" font-size="10.5"><tspan font-weight="600">users, roles, schools</tspan> (Accounts)</text>
          
          <circle cx="14" cy="62" r="2.2" fill="#000000" />
          <text x="22" y="66" fill="#222222" font-size="10.5"><tspan font-weight="600">verification_codes</tspan> (Password/2FA)</text>
          
          <circle cx="14" cy="84" r="2.2" fill="#000000" />
          <text x="22" y="88" fill="#222222" font-size="10.5"><tspan font-weight="600">books, categories, book_copies</tspan></text>
          
          <circle cx="14" cy="106" r="2.2" fill="#000000" />
          <text x="22" y="110" fill="#222222" font-size="10.5"><tspan font-weight="600">borrow_requests, access_tokens</tspan></text>
          
          <circle cx="14" cy="128" r="2.2" fill="#000000" />
          <text x="22" y="132" fill="#222222" font-size="10.5"><tspan font-weight="600">fines_penalties, system_logs</tspan></text>
          
          <rect x="8" y="144" width="249" height="18" rx="2" fill="#f9fafb" stroke="#cccccc" stroke-width="1" />
          <text x="132" y="157" fill="#111111" font-size="9.5" font-weight="600" text-anchor="middle">ACID Transaction Compliance Guaranteed</text>
        </g>

        <!-- Sub-block 2: Security & RLS -->
        <g transform="translate(303, 48)">
          <rect x="0" y="0" width="265" height="170" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.3" />
          <rect x="0" y="0" width="265" height="24" rx="4" fill="#f3f4f6" stroke="#000000" stroke-width="1.3" />
          <text x="10" y="16" fill="#000000" font-size="11.5" font-weight="700">Security &amp; Integrity Controls</text>
          
          <circle cx="14" cy="40" r="2.2" fill="#000000" />
          <text x="22" y="44" fill="#222222" font-size="10.5"><tspan font-weight="600">Row-Level Security (RLS)</tspan> Policies</text>
          
          <circle cx="14" cy="62" r="2.2" fill="#000000" />
          <text x="22" y="66" fill="#222222" font-size="10.5"><tspan font-weight="600">Multi-Tenant Isolation</tspan> (GNC vs SRC)</text>
          
          <circle cx="14" cy="84" r="2.2" fill="#000000" />
          <text x="22" y="88" fill="#222222" font-size="10.5"><tspan font-weight="600">Automated Daily Backups</tspan> in Cloud</text>
          
          <circle cx="14" cy="106" r="2.2" fill="#000000" />
          <text x="22" y="110" fill="#222222" font-size="10.5"><tspan font-weight="600">Foreign Key Constraints</tspan> &amp; Indexing</text>
          
          <circle cx="14" cy="128" r="2.2" fill="#000000" />
          <text x="22" y="132" fill="#222222" font-size="10.5"><tspan font-weight="600">SSL/TLS 1.3 Encryption</tspan> in Transit</text>

          <rect x="8" y="144" width="249" height="18" rx="2" fill="#f9fafb" stroke="#cccccc" stroke-width="1" />
          <text x="132" y="157" fill="#111111" font-size="9.5" font-weight="600" text-anchor="middle">Multi-School Data Isolation Enforced</text>
        </g>
      </g>

      <!-- Right Card: EXTERNAL CLOUD SERVICES & LIBRARIES (38% width) -->
      <g transform="translate(620, 0)">
        <rect x="0" y="0" width="380" height="235" rx="6" fill="#fcfcfc" stroke="#000000" stroke-width="1.8" />
        <path d="M 0 6 Q 0 0 6 0 L 374 0 Q 380 0 380 6 L 380 34 L 0 34 Z" fill="#000000" />
        <text x="16" y="22" fill="#ffffff" font-size="12" font-weight="700" letter-spacing="0.5">EXTERNAL CLOUD &amp; CLIENT SERVICES</text>
        <text x="364" y="22" fill="#e5e5e5" font-size="11" font-weight="600" text-anchor="end">Third-Party</text>

        <g transform="translate(16, 48)">
          <!-- Item 1 -->
          <rect x="0" y="0" width="348" height="38" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.2" />
          <text x="12" y="18" fill="#000000" font-size="11" font-weight="700">Supabase Cloud Platform</text>
          <text x="12" y="31" fill="#555555" font-size="10">Cloud Authentication, Storage &amp; Database Hosting</text>

          <!-- Item 2 -->
          <rect x="0" y="44" width="348" height="38" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.2" />
          <text x="12" y="62" fill="#000000" font-size="11" font-weight="700">Vercel Global Edge Network</text>
          <text x="12" y="75" fill="#555555" font-size="10">High-Availability CDN Frontend Web Hosting</text>

          <!-- Item 3 -->
          <rect x="0" y="88" width="348" height="38" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.2" />
          <text x="12" y="106" fill="#000000" font-size="11" font-weight="700">HTML5-QRCode &amp; Barcode Engine</text>
          <text x="12" y="119" fill="#555555" font-size="10">Client-Side Camera &amp; Hardware Optical Scanning</text>

          <!-- Item 4 -->
          <rect x="0" y="132" width="348" height="38" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.2" />
          <text x="12" y="150" fill="#000000" font-size="11" font-weight="700">Leaflet Geospatial Library</text>
          <text x="12" y="163" fill="#555555" font-size="10">Interactive Campus Mapping across Pampanga</text>
        </g>
      </g>
    </g>
  </svg>
  `;
}

module.exports = { getArchitectureSvg };
