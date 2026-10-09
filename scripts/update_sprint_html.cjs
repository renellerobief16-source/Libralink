const fs = require('fs');
const { getSprint1Svg, getSprint2Svg, getSprint3Svg } = require('./generate_all_sprint_usecases_4actors.cjs');

let html = fs.readFileSync('docs/sprint_use_case_diagrams.html', 'utf8');

// Replace SVGs
html = html.replace(/<svg id="svg-sprint1"[\s\S]*?<\/svg>/, getSprint1Svg());
html = html.replace(/<svg id="svg-sprint2"[\s\S]*?<\/svg>/, getSprint2Svg());
html = html.replace(/<svg id="svg-sprint3"[\s\S]*?<\/svg>/, getSprint3Svg());

// Update dimensions in downloadPng calls
html = html.replace(/downloadPng\('svg-sprint1', 'Figure_4_1_Sprint_1_Use_Case_Diagram\.png', \d+, \d+\)/g, "downloadPng('svg-sprint1', 'Figure_4_1_Sprint_1_Use_Case_Diagram.png', 1320, 920)");
html = html.replace(/downloadPng\('svg-sprint2', 'Figure_4_2_Sprint_2_Use_Case_Diagram\.png', \d+, \d+\)/g, "downloadPng('svg-sprint2', 'Figure_4_2_Sprint_2_Use_Case_Diagram.png', 1320, 920)");
html = html.replace(/downloadPng\('svg-sprint3', 'Figure_4_3_Sprint_3_Use_Case_Diagram\.png', \d+, \d+\)/g, "downloadPng('svg-sprint3', 'Figure_4_3_Sprint_3_Use_Case_Diagram.png', 1320, 940)");

// Add CSS for btn-copy, sprint-badge, and toast if not present
if (!html.includes('.btn-copy')) {
  html = html.replace('.btn:hover {', `    .btn-copy {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }
    .btn-copy:hover {
      background: #1d4ed8;
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
    .btn:hover {`);
}

// Add copyPngToClipboard button to the cards if not present
if (!html.includes("copyPngToClipboard('svg-sprint1'")) {
  html = html.replace(
    `<button class="btn" onclick="copySvg('svg-sprint1')">📋 Copy SVG</button>`,
    `<button class="btn btn-copy" onclick="copyPngToClipboard('svg-sprint1', 1280, 870)">📋 Copy Image (Ctrl+V)</button>\n          <button class="btn" onclick="copySvg('svg-sprint1')">📋 Copy SVG</button>`
  );
  html = html.replace(
    `<button class="btn" onclick="copySvg('svg-sprint2')">📋 Copy SVG</button>`,
    `<button class="btn btn-copy" onclick="copyPngToClipboard('svg-sprint2', 1280, 890)">📋 Copy Image (Ctrl+V)</button>\n          <button class="btn" onclick="copySvg('svg-sprint2')">📋 Copy SVG</button>`
  );
  html = html.replace(
    `<button class="btn" onclick="copySvg('svg-sprint3')">📋 Copy SVG</button>`,
    `<button class="btn btn-copy" onclick="copyPngToClipboard('svg-sprint3', 1280, 910)">📋 Copy Image (Ctrl+V)</button>\n          <button class="btn" onclick="copySvg('svg-sprint3')">📋 Copy SVG</button>`
  );
}

// Add sprint badge to titles if not present
if (!html.includes('<span class="sprint-badge sprint-1">SPRINT 1</span>')) {
  html = html.replace(
    `<div class="card-title">Figure 4.1: Sprint 1 Use Case Diagram</div>`,
    `<div class="card-title"><span class="sprint-badge sprint-1">SPRINT 1</span> Figure 4.1: Cross-School Catalog Search &amp; Holdings Indexing Use Case Diagram</div>`
  );
  html = html.replace(
    `<div class="card-title">Figure 4.2: Sprint 2 Use Case Diagram</div>`,
    `<div class="card-title"><span class="sprint-badge sprint-2">SPRINT 2</span> Figure 4.2: Inter-Library Request Routing &amp; Digital Access Token Pass</div>`
  );
  html = html.replace(
    `<div class="card-title">Figure 4.3: Sprint 3 Use Case Diagram</div>`,
    `<div class="card-title"><span class="sprint-badge sprint-3">SPRINT 3</span> Figure 4.3: Counter Circulation, Token Verification &amp; Audit Logs</div>`
  );
}

// Add copyPngToClipboard and showToast functions if not present
if (!html.includes('function copyPngToClipboard(')) {
  const scriptContent = `
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
  `;
  html = html.replace('function copySvg(svgId) {', scriptContent + '\n    function copySvg(svgId) {');
}

// Add toast container before </body>
if (!html.includes('id="toast"')) {
  html = html.replace('</body>', '  <div id="toast" class="toast"></div>\n</body>');
}

fs.writeFileSync('docs/sprint_use_case_diagrams.html', html, 'utf8');
console.log('Successfully updated docs/sprint_use_case_diagrams.html with 4-actor SVGs, copy button, and badges!');
