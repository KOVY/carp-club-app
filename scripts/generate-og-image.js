const puppeteer = require('puppeteer');
const path = require('path');

async function generateOGImage() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();

  // Set viewport to OG image dimensions
  await page.setViewport({
    width: 1200,
    height: 630,
    deviceScaleFactor: 1
  });

  // Load the HTML template
  const htmlPath = path.join(__dirname, '..', 'public', 'og-image.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Take screenshot
  const outputPath = path.join(__dirname, '..', 'public', 'og-image.png');
  await page.screenshot({
    path: outputPath,
    type: 'png'
  });

  await browser.close();

  console.log(`OG image generated: ${outputPath}`);
}

generateOGImage().catch(console.error);
