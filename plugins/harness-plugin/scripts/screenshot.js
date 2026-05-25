#!/usr/bin/env node
/**
 * screenshot.js — full-page + per-section screenshots via puppeteer-core
 *
 * Usage:
 *   node screenshot.js <html_path> <output_dir> <chrome_executable>
 *
 * Outputs in <output_dir>:
 *   desktop.png            (1440×900 viewport — hero / first viewport)
 *   desktop_full.png       (1440 wide × full page height)
 *   mobile.png             (390×844 viewport)
 *   mobile_full.png        (390 wide × full page height)
 *   desktop_<id>.png       (one per <section id="..."> — scrolled to that section)
 */

const path = require('path');
const fs = require('fs');

async function main() {
  const [htmlPath, outputDir, chromePath] = process.argv.slice(2);

  if (!htmlPath || !outputDir || !chromePath) {
    console.error('Usage: node screenshot.js <html_path> <output_dir> <chrome_executable>');
    process.exit(1);
  }
  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ HTML not found: ${htmlPath}`);
    process.exit(1);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // puppeteer-core is installed under ${CLAUDE_PLUGIN_DATA}/screenshot-tool/ by
  // install-agents.sh (not in the plugin directory, since plugin root may be read-only).
  let puppeteer;
  const dataDir = process.env.CLAUDE_PLUGIN_DATA;
  const candidates = [];
  if (dataDir) {
    candidates.push(path.join(dataDir, 'screenshot-tool', 'node_modules', 'puppeteer-core'));
  }
  candidates.push('puppeteer-core'); // fallback: standard resolution

  for (const p of candidates) {
    try {
      puppeteer = require(p);
      break;
    } catch (_) { /* try next */ }
  }
  if (!puppeteer) {
    console.error('❌ puppeteer-core not installed. Run install-agents.sh (needs node + npm).');
    process.exit(2);
  }

  const absHtml = path.resolve(htmlPath).replace(/\\/g, '/');
  const url = 'file:///' + absHtml.replace(/^\//, '');

  console.log(`📸 Browser: ${chromePath}`);
  console.log(`📄 Rendering: ${url}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  try {
    const page = await browser.newPage();

    // ---------- Desktop ----------
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

    await page.screenshot({
      path: path.join(outputDir, 'desktop.png'),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(outputDir, 'desktop_full.png'),
      fullPage: true,
    });

    // Per-section: collect section[id] then scroll + screenshot each
    const sectionIds = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('section[id], main[id], article[id]'))
        .map(el => el.id)
        .filter(Boolean);
    });

    for (const id of sectionIds) {
      await page.evaluate((sid) => {
        const el = document.getElementById(sid);
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      }, id);
      await new Promise(r => setTimeout(r, 250));
      await page.screenshot({
        path: path.join(outputDir, `desktop_${id}.png`),
        fullPage: false,
      });
    }

    // ---------- Mobile ----------
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

    await page.screenshot({
      path: path.join(outputDir, 'mobile.png'),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(outputDir, 'mobile_full.png'),
      fullPage: true,
    });

    // Summary
    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png')).sort();
    console.log('✅ Screenshots saved:');
    for (const f of files) {
      const size = fs.statSync(path.join(outputDir, f)).size;
      console.log(`   ${f.padEnd(28)} ${(size / 1024).toFixed(1)} KB`);
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('❌ Screenshot failed:', err.message);
  process.exit(1);
});
