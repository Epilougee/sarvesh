const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function exportAndVerify() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1200, height: 1600 },
  });

  const htmlPath = path.resolve(__dirname, '..', 'report', 'report.html');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  console.log('Loading report HTML:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Check page count in DOM
  const pages = await page.$$('.page');
  console.log(`Found ${pages.length} page sections in report.html.`);

  // 2. Check for overflow on each page
  const overflows = await page.evaluate(() => {
    const pageEls = document.querySelectorAll('.page');
    const results = [];
    pageEls.forEach((el, idx) => {
      // scrollHeight vs clientHeight
      const isOverflowing = el.scrollHeight > el.clientHeight + 2; // allowance of 2px for rounding
      results.push({
        pageNum: idx + 1,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflow: isOverflowing,
      });
    });
    return results;
  });

  console.log('Page overflow analysis:');
  let hasAnyOverflow = false;
  overflows.forEach((o) => {
    console.log(`Page ${o.pageNum}: scrollHeight=${o.scrollHeight}px, clientHeight=${o.clientHeight}px, overflow=${o.overflow}`);
    if (o.overflow) hasAnyOverflow = true;
  });

  if (hasAnyOverflow) {
    console.warn('WARNING: One or more pages have content overflow! Please adjust spacing.');
  } else {
    console.log('SUCCESS: All pages fit cleanly within their A4 boxes with zero overflow!');
  }

  // 3. Export to PDF
  const pdfPath = path.resolve(__dirname, '..', 'report', 'EduSchedule_Timetable_Management_Report.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  console.log('Saved PDF to:', pdfPath);

  // 4. Render pages 1, 5, 6, 8 to PNG
  const pagesToRender = [1, 5, 6, 8];
  for (const pageNum of pagesToRender) {
    const pageEl = pages[pageNum - 1];
    if (pageEl) {
      const renderPath = path.resolve(__dirname, '..', 'report', `page-${pageNum}.png`);
      await pageEl.screenshot({ path: renderPath });
      console.log(`Rendered Page ${pageNum} to ${renderPath}`);
    }
  }

  await browser.close();

  // 5. Verify PDF page count using python or node
  return { pdfPath, pageCount: pages.length, overflows };
}

exportAndVerify().catch(console.error);
