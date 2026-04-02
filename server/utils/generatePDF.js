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

// ── Persistent Browser Instance ───────────────────────────────────────────────
// Reusing a single browser across requests saves ~3-5s per PDF generation
// by avoiding the cold start overhead of launching Chrome each time.

let _browser = null;
let _browserLaunchPromise = null;

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-crash-reporter',
  '--disable-software-rasterizer',
  '--disable-seccomp-filter-sandbox',
  '--font-render-hinting=none',
];

const getBrowser = async () => {
  // If a browser is alive, reuse it
  if (_browser) {
    try {
      // Quick check: if the browser process is still running
      await _browser.version();
      return _browser;
    } catch {
      // Browser crashed or was killed — reset and relaunch
      console.warn('[PDF] Browser died, relaunching...');
      _browser = null;
      _browserLaunchPromise = null;
    }
  }

  // Prevent multiple simultaneous launches
  if (_browserLaunchPromise) {
    return _browserLaunchPromise;
  }

  _browserLaunchPromise = (async () => {
    const execPath = findChrome();
    console.log('[PDF] Launching browser at:', execPath);
    _browser = await puppeteer.launch({
      headless: true,
      executablePath: execPath,
      args: BROWSER_ARGS,
    });

    // Auto-reset if browser process exits
    _browser.on('disconnected', () => {
      console.warn('[PDF] Browser disconnected, will relaunch on next request.');
      _browser = null;
      _browserLaunchPromise = null;
    });

    _browserLaunchPromise = null;
    return _browser;
  })();

  return _browserLaunchPromise;
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

  // Handle company logo — convert to Base64 for Puppeteer so it renders instantly
  if (data.company?.logo) {
    try {
      if (data.company.logo.startsWith('/')) {
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
          console.warn('[PDF] Local logo not found on disk:', logoPath, '— Attempting fetch from FRONTEND_URL');
          const frontendUrl = process.env.FRONTEND_URL || 'https://jobcard.marutifurniture.com';
          const remoteUrl = frontendUrl.replace(/\/$/, '') + (data.company.logo.startsWith('/') ? data.company.logo : '/' + data.company.logo);
          try {
            const response = await fetch(remoteUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const contentType = response.headers.get('content-type') || 'image/png';
              data.company.logo = `data:${contentType};base64,${buffer.toString('base64')}`;
            } else {
              console.warn('[PDF] Fallback fetch failed with status:', response.status);
            }
          } catch (fetchErr) {
            console.error('[PDF] Error fetching fallback logo:', fetchErr.message);
          }
        }
      } else if (data.company.logo.startsWith('http')) {
        // Fetch remote logo (e.g. from Cloudinary) and embed it as Base64
        console.log('[PDF] Fetching remote logo to embed as Base64:', data.company.logo);
        const response = await fetch(data.company.logo);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = response.headers.get('content-type') || 'image/png';
          data.company.logo = `data:${contentType};base64,${buffer.toString('base64')}`;
        } else {
          console.warn('[PDF] Failed to fetch remote logo, status:', response.status);
        }
      }
    } catch (err) {
      console.error('[PDF] Logo Base64 conversion failed:', err);
    }
  }

  // Render EJS template with data
  const html = ejs.render(template, data, { filename: templatePath });

  // Get (or reuse) the persistent browser instance
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Use domcontentloaded (instant) + brief pause for fonts.
    // networkidle2 hangs in Cloud Run because Google Fonts requests stay
    // "pending" for a long time, causing the request to timeout.
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Give Google Fonts 2 seconds to load (renders ₹ and other glyphs correctly)
    await new Promise(r => setTimeout(r, 2000));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
      ...options,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
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
  const finalName = filename ? (filename.endsWith('.pdf') ? filename : `${filename}.pdf`) : undefined;
  const { url } = await uploadToCloudinary(buffer, folder, 'raw', finalName);
  return url;
};
