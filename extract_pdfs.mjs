import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const dir = './testBD';
const files = readdirSync(dir).filter(f => f.endsWith('.pdf'));
const results = {};

for (const file of files) {
  const buffer = readFileSync(join(dir, file));
  const data = await pdf(buffer);
  results[file] = data.text;
}

writeFileSync('./pdf_output.json', JSON.stringify(results, null, 2), 'utf-8');
console.log('Done! Extracted', files.length, 'PDFs');
