#!/usr/bin/env node
/**
 * open.js — open a produced artifact with the OS default application,
 * cross-platform (Windows / macOS / Linux). Used by SKILL.md Step 6 so the
 * user immediately SEES the result (index.html in a browser, .docx in Word, …).
 *
 * Usage:
 *   node open.js <file>
 *   node open.js <file> --print   # show the resolved opener command, don't launch (for tests)
 *
 * Non-fatal by design: an unsupported type, a headless box, or a launch error
 * just prints a note and exits 0 — it must never break the harness flow.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Only auto-open types that have a sensible default viewer.
const OPENABLE = new Set([
  '.html', '.htm', '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.csv',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.md', '.txt',
]);

function opener(target) {
  switch (process.platform) {
    case 'win32':  return { cmd: 'cmd', args: ['/c', 'start', '', target] }; // "" = window title
    case 'darwin': return { cmd: 'open', args: [target] };
    default:       return { cmd: 'xdg-open', args: [target] };
  }
}

function main() {
  const args = process.argv.slice(2);
  const printOnly = args.includes('--print');
  const target = args.find(a => a !== '--print');

  if (!target) { console.error('Usage: node open.js <file> [--print]'); process.exit(1); }

  const abs = path.resolve(target);
  if (!printOnly && !fs.existsSync(abs)) { console.log(`skip (not found): ${abs}`); return; }

  const ext = path.extname(abs).toLowerCase();
  if (!OPENABLE.has(ext)) { console.log(`skip (no default viewer for "${ext}"): ${abs}`); return; }

  const { cmd, args: a } = opener(abs);
  if (printOnly) { console.log(`${cmd} ${a.join(' ')}`); return; }

  try {
    const child = spawn(cmd, a, { stdio: 'ignore', detached: true });
    child.on('error', (e) => console.log(`skip (could not open: ${e.message})`));
    child.unref();
    console.log(`opened: ${abs}`);
  } catch (e) {
    console.log(`skip (could not open: ${e.message})`);
  }
}

main();
