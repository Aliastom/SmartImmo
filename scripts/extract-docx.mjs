import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

// Usage: node scripts/extract-docx.mjs <relative-or-absolute-docx-path>
// Example: node scripts/extract-docx.mjs ./bail-de-location-vide-gratuit.docx

async function main() {
  const inputPath = process.argv[2] || './bail-de-location-vide-gratuit.docx';
  const absPath = path.isAbsolute(inputPath)
    ? inputPath
    : path.join(process.cwd(), inputPath);

  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  try {
    const { value: text } = await mammoth.extractRawText({ path: absPath });
    console.log('===== EXTRACTED TEXT START =====');
    console.log(text);
    console.log('===== EXTRACTED TEXT END =====');
  } catch (err) {
    console.error('Failed to extract text from DOCX:', err);
    process.exit(1);
  }
}

main();
