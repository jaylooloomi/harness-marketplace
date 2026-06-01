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

// Navigate, but never let a slow/blocked resource (e.g. a CDN webfont that
// never settles) fail the whole capture; then wait for fonts so we don't
// screenshot a FOUT / blank-text frame (O4, E2).
async function loadAndSettle(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 12000 });
  } catch (e) {
    console.error(`   (page did not fully settle: ${e.message} — capturing anyway)`);
  }
  await page.evaluate(async () => {
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 300));
}

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
  // setup.js (not in the plugin directory, since plugin root may be read-only).
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
    console.error('❌ puppeteer-core not installed. Run /harness:update (needs node + npm).');
    process.exit(2);
  }

  const absHtml = path.resolve(htmlPath).replace(/\\/g, '/');
  const url = 'file:///' + absHtml.replace(/^\//, '');

  console.log(`📸 Browser: ${chromePath}`);
  console.log(`📄 Rendering: ${url}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  try {
    const page = await browser.newPage();

    // ---------- Desktop ----------
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await loadAndSettle(page, url);

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

    // Fallback (E4): a layout with few/no <section id> (common once the
    // generator drops conventional sectioned nav) would otherwise yield no
    // per-region shots. Capture viewport-height regions so the evaluator can
    // still inspect detail on demand.
    if (sectionIds.length < 2) {
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      const vh = 900;
      const chunks = Math.min(6, Math.ceil(pageHeight / vh));
      for (let i = 0; i < chunks; i++) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), i * vh);
        await new Promise(r => setTimeout(r, 200));
        await page.screenshot({ path: path.join(outputDir, `desktop_region_${i + 1}.png`), fullPage: false });
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    }

    // ---------- Mobile ----------
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await loadAndSettle(page, url);

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
