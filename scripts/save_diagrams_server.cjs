const http = require('http');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'generated_diagrams');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

let savedCount = 0;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, base64 } = JSON.parse(body);
        const data = base64.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(data, 'base64');
        const dest = path.join(targetDir, filename);
        fs.writeFileSync(dest, buf);
        console.log(`Saved: ${filename} (${buf.length} bytes)`);
        savedCount++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, savedCount }));

        if (savedCount >= 3) {
          console.log('All 3 diagrams saved! Shutting down server.');
          setTimeout(() => process.exit(0), 1000);
        }
      } catch (err) {
        console.error('Error saving diagram:', err);
        res.writeHead(500);
        res.end(err.message);
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3333, () => {
  console.log('Save diagrams server listening on port 3333');
});
