import JSZip from 'jszip';
import mammoth from 'mammoth';

// Parse file by extension and return extracted text
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  switch (ext) {
    case 'txt':
      return await file.text();
    case 'pdf':
      return await parsePDF(file);
    case 'docx':
    case 'doc':
      return await parseDOCX(file);
    case 'pptx':
      return await parsePPTX(file);
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

// Parse PDF using pdf.js
async function parsePDF(file) {
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    if (pageText.trim()) {
      textParts.push(pageText);
    }
  }

  return textParts.join('\n\n');
}

// Parse DOCX using mammoth
async function parseDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Parse PPTX using JSZip (extract text from slide XML)
async function parsePPTX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const textParts = [];

  // Get all slide files sorted by number
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)[1]);
      const numB = parseInt(b.match(/slide(\d+)/)[1]);
      return numA - numB;
    });

  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async('text');
    // Extract text from <a:t> tags
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const slideText = matches
      .map(m => m.replace(/<[^>]+>/g, ''))
      .join(' ')
      .trim();

    if (slideText) {
      textParts.push(slideText);
    }
  }

  return textParts.join('\n\n');
}
