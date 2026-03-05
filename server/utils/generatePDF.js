import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { uploadToCloudinary } from '../config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../templates');

/**
 * Render a Puppeteer PDF from an EJS-style HTML template.
 * 
 * @param {string} templateName - e.g. 'quotation' → reads templates/quotation.html
 * @param {object} data         - Data object injected via simple string replacement
 * @param {object} options      - Puppeteer PDF options override
 * @returns {Promise<Buffer>}   - PDF buffer
 */
export const renderPDF = async (templateName, data = {}, options = {}) => {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  let html = readFileSync(templatePath, 'utf-8');

  // Simple template variable replacement
  // For complex templates use EJS or Handlebars
  Object.entries(data).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    ...options,
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
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
