import puppeteer from 'puppeteer';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import ejs from 'ejs';
import { uploadToCloudinary } from '../config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../templates');

/**
 * Find Chrome executable — prefers Puppeteer bundled, falls back to system Chrome.
 */
const findChrome = () => {
  try {
    const bundled = puppeteer.executablePath();
    if (bundled && existsSync(bundled)) return bundled;
  } catch { /* bundled not found */ }

  const paths = [
    // Windows paths
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env.USERPROFILE || '', 'AppData/Local/Google/Chrome/Application/chrome.exe'),
    // Linux paths
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];

  for (const p of paths) {
    if (p && existsSync(p)) return p;
  }
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

  // Render EJS template with data
  const html = ejs.render(template, data, { filename: templatePath });

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
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
