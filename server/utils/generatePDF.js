import puppeteer from 'puppeteer';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import ejs from 'ejs';
import { uploadToCloudinary } from '../config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../templates');

/**
 * Find Chrome executable.
 * Priority: PUPPETEER_EXECUTABLE_PATH env var → system paths → puppeteer bundled
 */
const findChrome = () => {
  // 1. Env var set in Dockerfile / Cloud Run: /usr/bin/chromium
  if (process.env.PUPPETEER_EXECUTABLE_PATH &&
      existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 2. Known system paths
  const paths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    // Windows paths
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
  ];
  for (const p of paths) {
    if (p && existsSync(p)) return p;
  }

  // 3. Puppeteer bundled (local dev only)
  try {
    const bundled = puppeteer.executablePath();
    if (bundled && existsSync(bundled)) return bundled;
  } catch { /* not found */ }

  return undefined;
};

/**
 * Render a PDF from an EJS HTML template.
 * 
 * @param {string} templateName - e.g. 'quotation' → reads templates/quotation.html
 * @param {object} data         - Data object passed to EJS for rendering
 * @param {object} options      - Puppeteer PDF options override
 * @returns {Promise<Buffer>}   - PDF buffer
 */
export const renderPDF = async (templateName, data = {}, options = {}) => {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  const template = readFileSync(templatePath, 'utf-8');

  // Handle company logo — if it's a local path, convert to Base64 for Puppeteer
  if (data.company?.logo && data.company.logo.startsWith('/')) {
    try {
      // 1. Try server's own public assets directory (for deployment)
      let logoPath = path.join(__dirname, '../public/assets', path.basename(data.company.logo));
      
      // 2. Fallback to client public directory (for local dev dev environment)
      if (!existsSync(logoPath)) {
        const clientPublicPath = path.join(__dirname, '../../client/public');
        logoPath = path.join(clientPublicPath, data.company.logo);
      }

      if (existsSync(logoPath)) {
        const logoBuffer = readFileSync(logoPath);
        const ext = path.extname(logoPath).slice(1) || 'png';
        const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
        data.company.logo = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
      } else {
        console.warn('[PDF] Logo not found at expected paths:', logoPath);
      }
    } catch (err) {
      console.error('[PDF] Logo Base64 conversion failed:', err);
    }
  }

  // Render EJS template with data
  const html = ejs.render(template, data, { filename: templatePath });

  const execPath = findChrome();
  console.log('[PDF] Using Chrome at:', execPath);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: execPath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-crash-reporter',
      '--disable-software-rasterizer',
      '--disable-seccomp-filter-sandbox',
      '--font-render-hinting=none',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
      ...options,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
};


/**
 * Generate a PDF and upload it directly to Cloudinary.
 * Returns the Cloudinary URL.
 *
 * @param {string} templateName - e.g. 'quotation'
 * @param {object} data         - Template data
 * @param {string} folder       - Cloudinary folder e.g. 'maruti/quotations'
 * @param {string} filename     - e.g. 'MF-311025-001'
 * @returns {Promise<string>}   - Cloudinary PDF URL
 */
export const generateAndUploadPDF = async (templateName, data, folder, filename) => {
  const buffer = await renderPDF(templateName, data);
  const { url } = await uploadToCloudinary(buffer, folder, 'raw');
  return url;
};
