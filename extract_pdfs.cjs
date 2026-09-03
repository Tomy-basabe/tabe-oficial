const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const dir = './testBD';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));

async function main() {
  const results = {};
  for (const file of files) {
    console.log('Processing:', file);
    const buffer = fs.readFileSync(path.join(dir, file));
    const data = await pdf(buffer);
    results[file] = data.text;
  }
  fs.writeFileSync('./pdf_output.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('Done! Extracted', files.length, 'PDFs');
}

main().catch(console.error);
