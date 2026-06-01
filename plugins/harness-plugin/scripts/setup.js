#!/usr/bin/env node
/**
 * setup.js — cross-platform installer/updater for harness-plugin.
 *
 * Replaces install-agents.sh / update-agents.sh. Runs identically on
 * Windows / macOS / Linux (the PostInstall hook only needs `node`, which
 * Claude Code already ships with — a bare .sh hook silently fails on
 * Windows where there is no git-bash on PATH).
 *
 * Usage:
 *   node setup.js install     # clone role library if missing, build index, install puppeteer-core
 *   node setup.js update      # shallow-aware refresh of the role library, rebuild index
 *   node setup.js selftest    # exercise the role-filter logic (no network/IO)
 *
 * Responsibilities:
 *   1. Clone/update jnMetaCode/agency-agents-zh into ${CLAUDE_PLUGIN_DATA}/agency-agents-zh
 *   2. Build ${CLAUDE_PLUGIN_DATA}/roles-index.json from data/role-filter.json
 *      so the selector reads ONE file instead of scanning ~242 every run (C1)
 *   3. Best-effort install puppeteer-core for full-page screenshots
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROLE_REPO = 'https://github.com/jnMetaCode/agency-agents-zh';
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.CLAUDE_PLUGIN_DATA || path.join(PLUGIN_ROOT, '.plugin-data');
const AGENTS_DIR = path.join(DATA_DIR, 'agency-agents-zh');
const SCREENSHOT_DIR = path.join(DATA_DIR, 'screenshot-tool');
const INDEX_OUT = path.join(DATA_DIR, 'roles-index.json');
const ROLE_FILTER_PATH = path.join(PLUGIN_ROOT, 'data', 'role-filter.json');

const isWin = process.platform === 'win32';

function log(msg) { process.stdout.write(msg + '\n'); }

function run(cmd, args, opts = {}) {
  // .cmd shims (npm) require shell:true on Windows (Node refuses to spawn them otherwise).
  const shell = opts.shell ?? (isWin && /\.cmd$/i.test(cmd));
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts, shell });
  return r.status === 0;
}

function npmCmd() { return isWin ? 'npm.cmd' : 'npm'; }

// ---------- role-filter (single source of truth, shared with the selector) ----------

function loadFilter() {
  try {
    return JSON.parse(fs.readFileSync(ROLE_FILTER_PATH, 'utf8'));
  } catch (e) {
    // Conservative fallback mirrors role-filter.json so the index still builds.
    return {
      exclude_name_keywords: ['README', 'CONTRIBUTING', 'UPSTREAM', 'LICENSE', 'EXECUTIVE',
        'QUICKSTART', 'nexus-strategy', 'handoff-templates', 'agent-activation-prompts'],
      exclude_name_prefixes: ['phase-', 'scenario-', 'workflow-'],
    };
  }
}

function isRoleFile(relPath, filter) {
  const base = path.basename(relPath).toLowerCase();
  if (!base.endsWith('.md')) return false;
  for (const kw of filter.exclude_name_keywords || []) {
    if (base.includes(String(kw).toLowerCase())) return false;
  }
  for (const pre of filter.exclude_name_prefixes || []) {
    if (base.startsWith(String(pre).toLowerCase())) return false;
  }
  return true;
}

// Extract a compact role descriptor from the first 30 lines of a role .md.
function parseRole(absPath, relPath) {
  let lines = [];
  try {
    lines = fs.readFileSync(absPath, 'utf8').split(/\r?\n/).slice(0, 30);
  } catch { /* unreadable -> minimal descriptor */ }

  let name = '';
  let expertise = '';

  // YAML frontmatter?
  if (lines[0] && lines[0].trim() === '---') {
    const end = lines.indexOf('---', 1);
    const fm = end > 0 ? lines.slice(1, end) : lines.slice(1);
    for (const l of fm) {
      const mName = l.match(/^name:\s*(.+)$/);
      if (mName) name = mName[1].trim();
      const mDesc = l.match(/^description:\s*(.+)$/);
      if (mDesc && mDesc[1].trim() !== '>' && mDesc[1].trim() !== '|') {
        expertise = mDesc[1].trim();
      }
    }
  }
  if (!name) {
    const h = lines.find(l => /^#\s+/.test(l));
    if (h) name = h.replace(/^#\s+/, '').trim();
  }
  if (!expertise) {
    const body = lines.find(l => l.trim() && !/^#/.test(l) && !/^---/.test(l) && !/^[a-z_]+:/.test(l));
    if (body) expertise = body.trim();
  }
  if (!name) name = path.basename(relPath, '.md');

  // Department = first path segment under the repo root (engineering/design/...).
  const segs = relPath.split(/[\\/]/);
  const department = segs.length > 1 ? segs[0] : 'general';

  return {
    name,
    department,
    path: absPath.replace(/\\/g, '/'),
    expertise: expertise.slice(0, 240),
  };
}

function buildIndex() {
  if (!fs.existsSync(AGENTS_DIR)) {
    log('⚠️  role library not present — skipping index build');
    return 0;
  }
  const filter = loadFilter();
  const all = fs.readdirSync(AGENTS_DIR, { recursive: true })
    .map(p => String(p))
    .filter(p => p.toLowerCase().endsWith('.md'))
    .filter(p => isRoleFile(p, filter));

  const roles = all.map(rel => parseRole(path.join(AGENTS_DIR, rel), rel))
    .sort((a, b) => a.path.localeCompare(b.path));

  const index = {
    source: ROLE_REPO,
    role_count: roles.length,
    filter_version: filter.version || 'unknown',
    roles,
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(INDEX_OUT, JSON.stringify(index, null, 2));
  log(`📇 roles-index.json built: ${roles.length} roles -> ${INDEX_OUT}`);
  return roles.length;
}

// ---------- git ----------

function cloneRoles() {
  log('📥 cloning agency-agents-zh role library...');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // Self-heal a partial / .git-less checkout: `git clone` hard-fails on a
  // non-empty target, which would otherwise wedge install/update forever.
  if (fs.existsSync(AGENTS_DIR)) fs.rmSync(AGENTS_DIR, { recursive: true, force: true });
  return run('git', ['clone', '--depth=1', ROLE_REPO, AGENTS_DIR]);
}

function updateRoles() {
  // Shallow-aware update (E1): fetch + hard reset to the remote tip of the
  // current branch, which is correct for a --depth=1 clone (plain `git pull`
  // on a shallow clone is fragile).
  const branch = (spawnSync('git', ['-C', AGENTS_DIR, 'rev-parse', '--abbrev-ref', 'HEAD'],
    { encoding: 'utf8' }).stdout || '').trim();
  if (!branch || branch === 'HEAD') {
    // Detached HEAD / unknown branch: `origin/HEAD` may not resolve on a shallow
    // clone, so re-clone fresh (cloneRoles self-heals the existing dir).
    log('ℹ️  detached HEAD / unknown branch — re-cloning fresh');
    return cloneRoles();
  }
  log(`🔄 updating role library (branch ${branch})...`);
  return run('git', ['-C', AGENTS_DIR, 'fetch', '--depth=1', 'origin', branch]) &&
    run('git', ['-C', AGENTS_DIR, 'reset', '--hard', `origin/${branch}`]);
}

// ---------- puppeteer-core (optional, for full-page screenshots) ----------

function installPuppeteer() {
  log('');
  log('🔍 checking screenshot-tool (full-page screenshots)...');
  if (fs.existsSync(path.join(SCREENSHOT_DIR, 'node_modules', 'puppeteer-core'))) {
    log('✅ puppeteer-core already installed');
    return;
  }
  if (!run(npmCmd(), ['--version'], { stdio: 'ignore' })) {
    log('⚠️  npm not found — skipping puppeteer-core (screenshot.sh will use chrome CLI, viewport-only)');
    return;
  }
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  if (!fs.existsSync(path.join(SCREENSHOT_DIR, 'package.json'))) {
    run(npmCmd(), ['init', '-y'], { cwd: SCREENSHOT_DIR, stdio: 'ignore' });
  }
  log('📥 installing puppeteer-core (~5-10s)...');
  const ok = run(npmCmd(), ['install', 'puppeteer-core', '--no-fund', '--no-audit'], { cwd: SCREENSHOT_DIR });
  log(ok && fs.existsSync(path.join(SCREENSHOT_DIR, 'node_modules', 'puppeteer-core'))
    ? '✅ puppeteer-core installed — full-page screenshots enabled'
    : '❌ puppeteer-core install failed — screenshot.sh will fall back to chrome CLI');
}

// ---------- selftest ----------

function selftest() {
  const filter = loadFilter();
  const cases = [
    ['engineering/backend-architect.md', true],
    ['design/ui-designer.md', true],
    ['README.md', false],
    ['docs/CONTRIBUTING.md', false],
    ['workflow-handoff.md', false],
    ['phase-1-kickoff.md', false],
    ['scenario-launch.md', false],
    ['marketing/nexus-strategy.md', false],
    ['engineering/handoff-templates.md', false],
    ['ENGINEERING/Backend-Architect.MD', true],
  ];
  let pass = 0;
  for (const [p, want] of cases) {
    const got = isRoleFile(p, filter);
    const ok = got === want;
    if (ok) pass++;
    log(`${ok ? '✓' : '✗'} isRoleFile(${p}) = ${got} (want ${want})`);
  }
  log(`\n${pass}/${cases.length} passed`);
  process.exit(pass === cases.length ? 0 : 1);
}

// ---------- main ----------

function main() {
  const mode = (process.argv[2] || 'install').toLowerCase();

  if (mode === 'selftest') return selftest();

  if (mode === 'update') {
    const ok = fs.existsSync(path.join(AGENTS_DIR, '.git')) ? updateRoles() : cloneRoles();
    if (!ok) { log('❌ role library update failed (check network / git)'); process.exitCode = 1; }
    const n = buildIndex();
    log(ok ? `✅ update complete — ${n} roles available`
          : `⚠️  refresh failed; index rebuilt from existing files — ${n} roles available`);
    return;
  }

  // install (default)
  log('🔍 checking agency-agents-zh role library...');
  if (fs.existsSync(path.join(AGENTS_DIR, '.git'))) {
    log('✅ role library already present (run "/harness:update" to refresh)');
  } else if (!cloneRoles()) {
    log('❌ clone failed — check network, then run /harness:update');
    process.exitCode = 1;
  }
  const n = buildIndex();
  installPuppeteer();
  log('');
  log(n > 0 ? `✅ harness-plugin ready — ${n} roles indexed`
            : `⚠️  installed, but 0 roles indexed — check network and run /harness:update`);
}

main();
