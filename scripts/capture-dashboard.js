const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'report', 'screenshots');

async function captureDashboard() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Login as admin
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Wait until loading indicator disappears and cards appear
  await page.waitForSelector('text=Faculty Members', { timeout: 10000 });
  await page.waitForTimeout(2500);

  const dashPath = path.join(OUT_DIR, '02-dashboard.png');
  await page.screenshot({ path: dashPath });
  console.log('Successfully captured loaded dashboard to:', dashPath);

  await browser.close();
}

captureDashboard().catch(console.error);
