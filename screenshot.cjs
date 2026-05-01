const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const txt = await page.evaluate(el => el.textContent, btn);
    if (txt && txt.trim().length > 0) {
      await btn.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'C:/Users/danie/AppData/Local/Temp/header_preview.png', clip: { x: 0, y: 0, width: 1280, height: 160 } });
  await browser.close();
  console.log('done');
})();
