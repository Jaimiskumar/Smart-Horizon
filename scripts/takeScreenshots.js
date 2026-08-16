const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  const screenshotsDir = path.join(__dirname, '../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)){
      fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
     headless: "new",
     args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'] 
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // Navigate to Login Page
    console.log('Navigating to http://localhost:3000/login');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Screenshot 1: Login
    await page.screenshot({ path: path.join(screenshotsDir, '1_login.png') });
    console.log('Screenshot saved: 1_login.png');

    // Login as Admin
    console.log('Logging in as Admin...');
    await page.type('input[type="email"]', 'admin@traffic.gov');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for Admin Dashboard to load
    await delay(3000);
    // Screenshot 2: Admin Dashboard
    await page.screenshot({ path: path.join(screenshotsDir, '2_admin_dashboard.png') });
    console.log('Screenshot saved: 2_admin_dashboard.png');

    // Navigate to Traffic Monitoring if the link exists
    // The link might be an <a> with text "Traffic Monitoring" or href=/admin/traffic
    try {
        await page.goto('http://localhost:3000/admin/traffic', { waitUntil: 'networkidle2' });
        await delay(3000);
        await page.screenshot({ path: path.join(screenshotsDir, '3_traffic_monitoring.png') });
        console.log('Screenshot saved: 3_traffic_monitoring.png');
    } catch(e) { console.log('Failed to capture traffic monitoring'); }

    // Logout
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await delay(2000);

    // Login as Citizen
    console.log('Logging in as Citizen...');
    await page.type('input[type="email"]', 'citizen@example.com');
    await page.type('input[type="password"]', 'citizen123');
    await page.click('button[type="submit"]');
    
    // Wait for Citizen Dashboard
    await delay(3000);
    // Screenshot 4: Citizen Dashboard (Parking Map)
    await page.screenshot({ path: path.join(screenshotsDir, '4_citizen_dashboard.png') });
    console.log('Screenshot saved: 4_citizen_dashboard.png');

    // Navigate to Citizen Report
    try {
        await page.goto('http://localhost:3000/citizen/report', { waitUntil: 'networkidle2' });
        await delay(2000);
        await page.screenshot({ path: path.join(screenshotsDir, '5_citizen_report.png') });
        console.log('Screenshot saved: 5_citizen_report.png');
    } catch(e) { console.log('Failed to capture citizen report'); }

  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
    console.log('Screenshots completed successfully!');
  }
})();
