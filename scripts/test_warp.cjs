const { PNG } = require('pngjs');
const fs = require('fs');

function cross2d(v1, v2) {
  return v1.x * v2.y - v1.y * v2.x;
}

function invBilinear(p, p0, p1, p2, p3) {
  const e = { x: p1.x - p0.x, y: p1.y - p0.y };
  const f = { x: p3.x - p0.x, y: p3.y - p0.y };
  const g = { x: p0.x - p1.x + p2.x - p3.x, y: p0.y - p1.y + p2.y - p3.y };
  const q = { x: p.x - p0.x, y: p.y - p0.y };

  const k2 = cross2d(g, f);
  const k1 = cross2d(e, f) + cross2d(q, g);
  const k0 = cross2d(q, e);

  let v = 0;
  if (Math.abs(k2) < 0.0001) {
    v = -k0 / k1;
  } else {
    const w = k1 * k1 - 4 * k0 * k2;
    if (w < 0) return null;
    const d = Math.sqrt(w);
    const v1 = (-k1 - d) / (2 * k2);
    const v2 = (-k1 + d) / (2 * k2);
    v = (v1 >= 0 && v1 <= 1) ? v1 : v2;
  }

  const denomX = e.x + g.x * v;
  const denomY = e.y + g.y * v;
  let u = 0;
  if (Math.abs(denomX) > Math.abs(denomY)) {
    u = (q.x - f.x * v) / denomX;
  } else {
    u = (q.y - f.y * v) / denomY;
  }

  if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
    return { u, v };
  }
  return null;
}

function processCleanMockup(refPath, screenshotPath, outPngPath) {
  const ref = PNG.sync.read(fs.readFileSync(refPath));
  const src = PNG.sync.read(fs.readFileSync(screenshotPath));
  const out = new PNG({ width: ref.width, height: ref.height });

  // 1. Copy base ref to out
  ref.data.copy(out.data);

  // 2. Clean right background: solid dark navy gradient without text or artifacts
  for (let y = 0; y < ref.height; y++) {
    const tY = y / ref.height;
    const baseR = Math.round(36 * (1 - tY * 0.35));
    const baseG = Math.round(52 * (1 - tY * 0.35));
    const baseB = Math.round(80 * (1 - tY * 0.35));

    // For rows above keyboard deck (y < 420):
    const screenRightEdge = Math.min(ref.width, Math.round(565 + y * 0.23));
    const startX = (y < 365) ? (screenRightEdge + 10) : Math.round(650 + (y - 365) * 0.8);

    if (y < 420) {
      for (let x = Math.min(ref.width - 1, startX); x < ref.width; x++) {
        const idx = (y * ref.width + x) * 4;
        const tX = (x - startX) / (ref.width - startX);
        out.data[idx] = Math.round(baseR * (1 - tX * 0.22));
        out.data[idx + 1] = Math.round(baseG * (1 - tX * 0.22));
        out.data[idx + 2] = Math.round(baseB * (1 - tX * 0.22));
        out.data[idx + 3] = 255;
      }
    } else {
      // Inpaint watermark at bottom right (x > 810, y > 490)
      for (let x = 810; x < ref.width; x++) {
        if (y > 490) {
          const sIdx = (y * ref.width + 805) * 4;
          const idx = (y * ref.width + x) * 4;
          out.data[idx] = ref.data[sIdx];
          out.data[idx + 1] = ref.data[sIdx + 1];
          out.data[idx + 2] = ref.data[sIdx + 2];
          out.data[idx + 3] = 255;
        }
      }
    }
  }

  // 3. Completely reconstruct the bottom-left blur area (x: 0..340, y: 435..587)
  // Diagonal edge runs from hinge (82, 418) to front corner (208, 570)
  for (let y = 430; y < ref.height; y++) {
    const xEdge = Math.round(82 + (y - 418) * ((208 - 82) / (570 - 418)));

    // Area to the left of the laptop chassis edge is pure clean dark navy
    for (let x = 0; x < Math.max(0, xEdge - 4); x++) {
      if (y >= 440 && x < 330) {
        const idx = (y * ref.width + x) * 4;
        out.data[idx] = 28;
        out.data[idx + 1] = 41;
        out.data[idx + 2] = 65;
        out.data[idx + 3] = 255;
      }
    }

    // Bevel side edge (thickness of laptop base):
    for (let x = Math.max(0, xEdge - 4); x <= xEdge; x++) {
      if (x < ref.width && y < 570) {
        const idx = (y * ref.width + x) * 4;
        out.data[idx] = 110;
        out.data[idx + 1] = 112;
        out.data[idx + 2] = 120;
        out.data[idx + 3] = 255;
      }
    }

    // Edge highlight reflection stroke:
    if (xEdge + 1 < ref.width && y < 570) {
      const idx = (y * ref.width + xEdge + 1) * 4;
      out.data[idx] = 222;
      out.data[idx + 1] = 224;
      out.data[idx + 2] = 230;
      out.data[idx + 3] = 255;
    }

    // Inside laptop palm rest deck:
    // Sample clean palm rest color at x=340
    const cleanSampleIdx = (Math.min(ref.height - 1, y) * ref.width + 340) * 4;
    const palmR = ref.data[cleanSampleIdx];
    const palmG = ref.data[cleanSampleIdx + 1];
    const palmB = ref.data[cleanSampleIdx + 2];

    for (let x = xEdge + 2; x <= 335; x++) {
      if (x < ref.width && y < 570) {
        const idx = (y * ref.width + x) * 4;
        const blend = (x - (xEdge + 2)) / (335 - (xEdge + 2));
        out.data[idx] = Math.round(180 * (1 - blend) + palmR * blend);
        out.data[idx + 1] = Math.round(178 * (1 - blend) + palmG * blend);
        out.data[idx + 2] = Math.round(182 * (1 - blend) + palmB * blend);
        out.data[idx + 3] = 255;
      }
    }

    // If y >= 570 (below front lip): dark bottom drop shadow
    if (y >= 570) {
      for (let x = 0; x <= 330; x++) {
        const idx = (y * ref.width + x) * 4;
        out.data[idx] = 20;
        out.data[idx + 1] = 28;
        out.data[idx + 2] = 45;
        out.data[idx + 3] = 255;
      }
    }
  }

  // 4. Map Screen Quad accurately onto the laptop monitor display
  const p0 = { x: 26, y: 6 };       // Top-Left
  const p1 = { x: 561, y: 6 };      // Top-Right
  const p2 = { x: 647, y: 362 };    // Bottom-Right (hinge right)
  const p3 = { x: 99, y: 418 };     // Bottom-Left (hinge left)

  const minX = Math.min(p0.x, p1.x, p2.x, p3.x);
  const maxX = Math.max(p0.x, p1.x, p2.x, p3.x);
  const minY = Math.min(p0.y, p1.y, p2.y, p3.y);
  const maxY = Math.max(p0.y, p1.y, p2.y, p3.y);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const uv = invBilinear({ x, y }, p0, p1, p2, p3);
      if (uv) {
        const sx = uv.u * (src.width - 1);
        const sy = uv.v * (src.height - 1);
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = Math.min(src.width - 1, x0 + 1);
        const y1 = Math.min(src.height - 1, y0 + 1);
        const fx = sx - x0;
        const fy = sy - y0;

        const idx00 = (y0 * src.width + x0) * 4;
        const idx10 = (y0 * src.width + x1) * 4;
        const idx01 = (y1 * src.width + x0) * 4;
        const idx11 = (y1 * src.width + x1) * 4;

        const r = (1 - fx) * (1 - fy) * src.data[idx00] + fx * (1 - fy) * src.data[idx10] + (1 - fx) * fy * src.data[idx01] + fx * fy * src.data[idx11];
        const g = (1 - fx) * (1 - fy) * src.data[idx00 + 1] + fx * (1 - fy) * src.data[idx10 + 1] + (1 - fx) * fy * src.data[idx01 + 1] + fx * fy * src.data[idx11 + 1];
        const b = (1 - fx) * (1 - fy) * src.data[idx00 + 2] + fx * (1 - fy) * src.data[idx10 + 2] + (1 - fx) * fy * src.data[idx01 + 2] + fx * fy * src.data[idx11 + 2];

        // Soft realistic glass glare reflection
        const glare = (1 - uv.v) * 0.05 * (1 - uv.u);

        const outIdx = (y * ref.width + x) * 4;
        out.data[outIdx] = Math.min(255, Math.round(r * (1 + glare)));
        out.data[outIdx + 1] = Math.min(255, Math.round(g * (1 + glare)));
        out.data[outIdx + 2] = Math.min(255, Math.round(b * (1 + glare)));
        out.data[outIdx + 3] = 255;
      }
    }
  }

  fs.writeFileSync(outPngPath, PNG.sync.write(out));
  console.log('Saved clean PNG:', outPngPath);
}

const refImg = 'C:\\Users\\Renel\\.gemini\\antigravity-ide\\brain\\b6ab7f67-dfc5-40d4-bb5a-3aa05dd04812\\.user_uploaded\\media_1791341289430.png';
const step1Img = 'C:\\Users\\Renel\\.gemini\\antigravity-ide\\brain\\b6ab7f67-dfc5-40d4-bb5a-3aa05dd04812\\.user_uploaded\\media_1791340262287.png';
const step2Img = 'C:\\Users\\Renel\\.gemini\\antigravity-ide\\brain\\b6ab7f67-dfc5-40d4-bb5a-3aa05dd04812\\.user_uploaded\\media_1791340288293.png';

processCleanMockup(refImg, step1Img, 'public/libralink_checkout_step1_details.png');
processCleanMockup(refImg, step2Img, 'public/libralink_checkout_step2_submit.png');
