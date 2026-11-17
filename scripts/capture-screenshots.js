const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'report', 'screenshots');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  console.log('1. Capturing Login Page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '01-login.png') });
  console.log('Saved 01-login.png');

  console.log('2. Logging in as Admin...');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000);

  console.log('3. Capturing Admin Dashboard...');
  await page.screenshot({ path: path.join(OUT_DIR, '02-dashboard.png') });
  console.log('Saved 02-dashboard.png');

  console.log('4. Capturing Timetable Builder...');
  await page.goto('http://localhost:3000/timetable/builder', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '03-timetable-builder.png') });
  console.log('Saved 03-timetable-builder.png');

  console.log('5. Triggering Clash Detection...');
  // Find an assign button or slot to trigger clash
  // Dr. Ramesh Sharma teaches CS301 on Monday Period 1 in Seminar Hall 1
  // Let's click an empty assign button on Monday or Tuesday
  const assignButtons = await page.$$('button:has-text("Assign")');
  if (assignButtons.length > 0) {
    await assignButtons[0].click();
    await page.waitForTimeout(500);

    // Select Dr. Ramesh Sharma and select Monday / Period 1 if possible
    // In modal, let's select a faculty that conflicts or room that conflicts
    // In modal, find faculty select
    const selects = await page.$$('div.fixed select');
    if (selects.length >= 3) {
      // Faculty is select index 1
      // Room is select index 2
      // Let's submit to trigger clash or pick a conflicting option
      await page.click('div.fixed button[type="submit"]');
      await page.waitForTimeout(1500);
    }
  }
  await page.screenshot({ path: path.join(OUT_DIR, '04-clash-detection.png') });
  console.log('Saved 04-clash-detection.png');

  // Close modal if open
  const cancelBtn = await page.$('div.fixed button:has-text("Cancel")');
  if (cancelBtn) await cancelBtn.click();

  console.log('6. Capturing Weekly Timetable View...');
  await page.goto('http://localhost:3000/timetable/view', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '05-weekly-timetable-view.png') });
  console.log('Saved 05-weekly-timetable-view.png');

  console.log('7. Capturing Faculty Attendance Roster...');
  await page.goto('http://localhost:3000/attendance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '06-faculty-attendance.png') });
  console.log('Saved 06-faculty-attendance.png');

  console.log('8. Capturing School Mode...');
  // Switch to school mode via settings or topbar
  await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // Click School radio
  const schoolRadio = await page.$('input[value="school"]');
  if (schoolRadio) {
    await schoolRadio.click();
    await page.click('button:has-text("Save Settings")');
    await page.waitForTimeout(1500);
  }
  // Now navigate to timetable builder in School mode
  await page.goto('http://localhost:3000/timetable/builder', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '08-school-mode.png') });
  console.log('Saved 08-school-mode.png');

  // Switch back to college mode in settings
  await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const collegeRadio = await page.$('input[value="college"]');
  if (collegeRadio) {
    await collegeRadio.click();
    await page.click('button:has-text("Save Settings")');
    await page.waitForTimeout(1500);
  }

  console.log('9. Capturing Faculty Personal Schedule...');
  // Logout
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="text"]', 'ramesh.sharma@campus.edu');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  // Should redirect to /my-timetable
  if (!page.url().includes('my-timetable')) {
    await page.goto('http://localhost:3000/my-timetable', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, '07-faculty-my-timetable.png') });
  console.log('Saved 07-faculty-my-timetable.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
