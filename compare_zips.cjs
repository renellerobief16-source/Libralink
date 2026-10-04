const { execSync } = require('child_process');

function getEntries(file) {
  const cmd = `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $z = [System.IO.Compression.ZipFile]::OpenRead('${file}'); $z.Entries.FullName; $z.Dispose()"`;
  return execSync(cmd).toString().trim().split('\r\n');
}

const orig = getEntries('Libralink-Final1-Original-Backup.docx');
const upd = getEntries('Libralink-Final-Updated.docx');

console.log('Original count:', orig.length);
console.log('Updated count:', upd.length);
console.log('First 10 orig:', orig.slice(0, 10));
console.log('First 10 upd:', upd.slice(0, 10));

const missingInUpd = orig.filter(x => !upd.includes(x));
console.log('Missing in updated:', missingInUpd);
