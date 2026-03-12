/**
 * Label print service (Windows).
 * Polls POS API for type=label print jobs, renders labels to PDF, prints to default/named printer, marks jobs done.
 * Config via env: API_BASE_URL, PRINT_API_TOKEN, COMPANY_ID, POLL_INTERVAL_MS, PRINTER_NAME.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const bwipjs = require('bwip-js');
const { print: printPdf } = require('pdf-to-printer');
const puppeteer = require('puppeteer');

const API_BASE_URL = (process.env.API_BASE_URL || '').replace(/\/$/, '');
const PRINT_API_TOKEN = process.env.PRINT_API_TOKEN || '';
const COMPANY_ID = parseInt(process.env.COMPANY_ID || '1', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const PRINTER_NAME = process.env.PRINTER_NAME || undefined; // undefined = default printer

if (!API_BASE_URL || !PRINT_API_TOKEN) {
  console.error('Set API_BASE_URL and PRINT_API_TOKEN (and optionally COMPANY_ID, POLL_INTERVAL_MS, PRINTER_NAME).');
  process.exit(1);
}

function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function barcodeToDataUrl(barcode, heightPx) {
  if (!barcode || !barcode.trim()) return '';
  try {
    const scale = heightPx >= 45 ? 3 : heightPx >= 35 ? 2.5 : 2;
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: String(barcode).trim(),
      scale,
      height: Math.max(6, heightPx / 4),
      includetext: false,
    });
    return 'data:image/png;base64,' + png.toString('base64');
  } catch (err) {
    console.warn('Barcode encode failed for', barcode, err.message);
    return '';
  }
}

function getDims(size) {
  const map = {
    xsmall: { w: 102, h: 68 },
    small: { w: 130, h: 75 },
    medium: { w: 180, h: 95 },
    large: { w: 230, h: 115 },
  };
  return map[size] || map.medium;
}

function getBarcodeHeight(size) {
  const map = { xsmall: 28, small: 35, medium: 45, large: 55 };
  return map[size] || 45;
}

function getPriceFontSize(size) {
  const map = { xsmall: 12, small: 15, medium: 18, large: 22 };
  return map[size] || 18;
}

function getNameFontSize(size) {
  const map = { xsmall: 8, small: 9, medium: 9, large: 10 };
  return map[size] || 9;
}

async function buildLabelHtml(payload) {
  const { shopName = '', size = 'medium', showName = true, showShop = true, labels = [] } = payload;
  const dims = getDims(size);
  const barcodeH = getBarcodeHeight(size);
  const priceSize = getPriceFontSize(size);
  const nameSize = getNameFontSize(size);
  const padding = size === 'xsmall' ? '3px 4px' : '5px 6px';
  const nameMaxLen = size === 'xsmall' ? 18 : 28;

  const labelDivs = [];
  for (const item of labels) {
    const copies = Math.max(1, parseInt(item.copies, 10) || 1);
    const name = (item.short_name || item.product_name || '').slice(0, nameMaxLen);
    const barcodeDataUrl = await barcodeToDataUrl(item.barcode || '', barcodeH);

    for (let i = 0; i < copies; i++) {
      const barcodeImg = barcodeDataUrl
        ? `<img src="${barcodeDataUrl}" alt="" style="max-width:${dims.w - 16}px;height:${barcodeH}px;object-fit:contain;" />`
        : `<div style="font-size:9px;">${escapeHtml(item.barcode || 'No barcode')}</div>`;

      labelDivs.push(`
        <div class="label-item" style="width:${dims.w}px;height:${dims.h}px;border:1px solid #999;border-radius:3px;padding:${padding};display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;margin:3px;background:#fff;page-break-inside:avoid;font-family:Arial,sans-serif;">
          ${showShop && shopName ? `<div style="font-size:8px;color:#888;font-weight:600;">${escapeHtml(String(shopName).toUpperCase())}</div>` : ''}
          ${showName ? `<div style="font-size:${nameSize}px;font-weight:600;text-align:center;">${escapeHtml(name)}</div>` : ''}
          ${barcodeImg}
          <div style="font-size:${priceSize}px;font-weight:800;">Rs ${Number(item.selling_price || 0).toFixed(2)}</div>
        </div>`);
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print Labels</title>
<style>body{margin:0;padding:10px;background:#fff;}</style></head>
<body>${labelDivs.join('')}</body></html>`;
}

async function renderPdf(html) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    const tmpDir = os.tmpdir();
    const pdfPath = path.join(tmpDir, `label-print-${Date.now()}.pdf`);
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      margin: { top: '10px', right: '10px', bottom: '10px', left: '10px' },
    });
    return pdfPath;
  } finally {
    await browser.close();
  }
}

async function printPdfToPrinter(pdfPath) {
  const options = PRINTER_NAME ? { printer: PRINTER_NAME } : {};
  await printPdf(pdfPath, options);
}

async function fetchPendingJobs() {
  const url = `${API_BASE_URL}/api/print-jobs/pending?token=${encodeURIComponent(PRINT_API_TOKEN)}&company_id=${COMPANY_ID}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pending jobs failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data.jobs) ? data.jobs : [];
}

async function markJobDone(jobId) {
  const url = `${API_BASE_URL}/api/print-jobs/${jobId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-print-token': PRINT_API_TOKEN },
    body: JSON.stringify({ status: 'done' }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mark done failed ${res.status}: ${text}`);
  }
}

async function processJob(job) {
  const { job_id, type, payload } = job;
  if (type !== 'label') return;

  console.log(`Processing label job ${job_id}...`);
  let pdfPath;
  try {
    const html = await buildLabelHtml(payload);
    pdfPath = await renderPdf(html);
    await printPdfToPrinter(pdfPath);
    await markJobDone(job_id);
    console.log(`Job ${job_id} printed and marked done.`);
  } catch (err) {
    console.error(`Job ${job_id} failed:`, err.message);
    try {
      await fetch(`${API_BASE_URL}/api/print-jobs/${job_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-print-token': PRINT_API_TOKEN },
        body: JSON.stringify({ status: 'failed' }),
      });
    } catch (e) {
      console.error('Could not mark job failed:', e.message);
    }
  } finally {
    if (pdfPath && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
      } catch (_) {}
    }
  }
}

async function pollOnce() {
  try {
    const jobs = await fetchPendingJobs();
    const labelJobs = jobs.filter((j) => j.type === 'label');
    for (const job of labelJobs) {
      await processJob(job);
    }
  } catch (err) {
    console.error('Poll error:', err.message);
  }
}

async function main() {
  console.log('Label print service started.');
  console.log(`API: ${API_BASE_URL}, company: ${COMPANY_ID}, poll: ${POLL_INTERVAL_MS}ms`);
  if (PRINTER_NAME) console.log(`Printer: ${PRINTER_NAME}`);
  else console.log('Printer: default');

  for (;;) {
    await pollOnce();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
