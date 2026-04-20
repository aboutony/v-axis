// apps/api/src/services/pdf.service.ts

import puppeteer from 'puppeteer';

export const generateExecutiveExport = async (htmlContent: string) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Set the viewport to match our "Vivid" dashboard resolution
  await page.setViewport({ width: 1920, height: 1080 });

  // 2. Inject the HTML content (The "Story" of the administrative assets)
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  // 3. Generate the "WOW-Factor" PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true, // Crucial for Tailwind gradients & emerald glows
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    displayHeaderFooter: true,
    footerTemplate: `
      <div style="font-size: 8px; width: 100%; text-align: center; font-family: sans-serif; opacity: 0.5;">
        V-AXIS SOVEREIGN REPORT | PAGE <span class="pageNumber"></span> OF <span class="totalPages"></span>
      </div>`
  });

  await browser.close();
  return pdfBuffer;
};