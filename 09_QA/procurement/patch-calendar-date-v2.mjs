import fs from 'node:fs';

const file = '04_OWNER/Procurement/index.html';
const source = fs.readFileSync(file, 'utf8');
const oldLine = "function addDays(dateStr,n){const d=new Date(dateStr+'T00:00:00+07:00');d.setDate(d.getDate()+Number(n||0));return d.toISOString().slice(0,10)}";
const newLine = "function addDays(dateStr,n){const m=/^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(dateStr||'');if(!m)return '';const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])+Number(n||0)));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`}";

if (source.includes(newLine)) {
  console.log('Calendar-date patch already applied.');
  process.exit(0);
}
if (!source.includes(oldLine)) {
  console.error('Expected old addDays implementation not found; refusing to modify source.');
  process.exit(1);
}

const next = source.replace(oldLine, newLine);
fs.writeFileSync(file, next);
console.log('Patched Procurement addDays() to timezone-safe calendar arithmetic.');
