#!/usr/bin/env node

/**
 * CI auditor entrypoint for @dpdpguard/claude-code-plugin.
 * Invoked by the GitHub Action in action.yml, or directly from a CLI.
 *
 * SCOPE — read this before trusting the exit code.
 *
 * This executes the pattern-matchable subset of the audit rule catalog in
 * `plugins/dpdpguard/skills/dpdp-audit/references/rule-catalog.md`: five of
 * its twenty-six rules. The other twenty-one need code read in context —
 * whether a consent checkbox gates a processing purpose, whether erasure
 * reaches derived stores, whether a notice carries the required disclosures —
 * and a regex cannot answer those. Run `/dpdp-audit` inside Claude Code for
 * the full catalog.
 *
 * The catalog is also explicit that **a grep hit is a candidate, never a
 * finding**: every rule carries a confirmation step that a human or the audit
 * skill performs. This tool reports candidates and says so. A clean run means
 * "these five patterns did not match", not "this codebase is compliant" —
 * that is a determination no scanner makes.
 *
 * Dependency-free by design: `action.yml` runs it on the node20 runtime with
 * no install step.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// --- inputs ----------------------------------------------------------------

const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];

const inputs = {
  regulations: process.env.INPUT_REGULATIONS || 'dpdp,gdpr,ccpa,pdpa',
  failOn: process.env['INPUT_FAIL-ON'] || 'high',
  config: process.env.INPUT_CONFIG || '.dpdpguard.yaml',
};

const rootDir = path.resolve(process.argv[2] || process.env.INPUT_PATH || process.cwd());

// --- rule definitions ------------------------------------------------------

/**
 * Personal-data tokens, per DPDP-A01. Deliberately the catalog's list rather
 * than a tuned one — a rule that silently narrows its own signal is worse than
 * a noisy one, and `dpdpguard:allow` exists for the false positives.
 */
const PII_TOKEN =
  /\b(e-?mail|phone|mobile|aadhaar|aadhar|pan_?number|passport|ssn|dob|date_of_birth|otp|password|token|address)\b/i;

const LOG_CALL =
  /(console\.(log|info|warn|error|debug)|\b(logger|log|logging)\.(log|info|warn|warning|error|debug)|System\.out\.print\w*|fmt\.Print\w*|\bprintln?\s*\()/;

/** Values that look like documentation rather than a live credential. */
const PLACEHOLDER =
  /^(x{3,}|y{3,}|changeme|change_me|placeholder|your[_-]?\w*|<[^>]*>|example\w*|sample\w*|dummy\w*|test[_-]?\w*|redacted|todo|\*{3,}|\.{3,})$/i;

const RULES = [
  {
    id: 'DPDP-A01',
    title: 'Personal data in application logs',
    severity: 'critical',
    statute: 'DPDP §8(5); GDPR Art.32(1)(a)',
    regulations: ['dpdp', 'gdpr'],
    confirm:
      'Check the logged value is a real subject identifier, not a literal or a redacted/hashed wrapper.',
    match: (line) => LOG_CALL.test(line) && PII_TOKEN.test(line),
  },
  {
    id: 'DPDP-A02',
    title: 'Personal data in URL query parameters',
    severity: 'high',
    statute: 'DPDP §8(5); GDPR Art.5(1)(f)',
    regulations: ['dpdp', 'gdpr'],
    confirm:
      'Check the parameter carries a subject identifier on a GET request. Query strings land in access logs, browser history and Referer headers.',
    match: (line) => /[?&](e-?mail|phone|mobile|aadhaar|aadhar|token|otp|user_email|ssn)=/i.test(line),
  },
  {
    id: 'DPDP-A05',
    title: 'Hardcoded credential or API key',
    severity: 'critical',
    statute: 'DPDP §8(5); GDPR Art.32',
    regulations: ['dpdp', 'gdpr'],
    confirm: 'Check the value is live rather than a placeholder, and rotate it if so.',
    match: (line) => {
      // DPDPGuard's own credentials, matched on prefix — the platform uses
      // distinct prefixes so a leaked key is identifiable on sight. Kept in
      // step with hooks/pii-commit-guard.sh.
      if (/\bdpdpg_(live|test|agent)_[A-Za-z0-9_-]{8,}/.test(line)) return true;

      const assignment = line.match(
        /\b(api[_-]?key|secret|passwd|password|auth[_-]?token)\b\s*[:=]\s*["'`]([A-Za-z0-9_\-]{16,})["'`]/i,
      );
      if (assignment && !PLACEHOLDER.test(assignment[2])) return true;

      return /\b(sk-[A-Za-z0-9]{16,}|gh[pos]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/.test(
        line,
      );
    },
    // A key checked into a documented example is the documented behaviour.
    skipFile: (file) => /\.(example|sample|template|dist)\b|\.env\.example$/i.test(file),
  },
  {
    id: 'DPDP-F01',
    title: 'Personal data over plaintext transport, or TLS verification disabled',
    severity: 'critical',
    statute: 'DPDP §8(5); GDPR Art.32(1)',
    regulations: ['dpdp', 'gdpr'],
    confirm:
      'Check the endpoint carries personal data and is not a local development target.',
    match: (line) => {
      if (/\brejectUnauthorized\s*:\s*false|\bverify\s*=\s*False\b|\bInsecureSkipVerify\s*:\s*true/.test(line)) {
        return true;
      }
      const http = line.match(/http:\/\/([A-Za-z0-9._-]+)/);
      if (!http) return false;
      // localhost and the loopback range are development targets, not transport
      // of personal data over an untrusted network.
      return !/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|host\.docker\.internal|.*\.local)$/i.test(
        http[1],
      );
    },
  },
  {
    id: 'DPDP-F02',
    title: 'Weak or reversible password storage',
    severity: 'critical',
    statute: 'DPDP §8(5); GDPR Art.32(1)(a)',
    regulations: ['dpdp', 'gdpr'],
    confirm:
      'Check the digest is applied to a credential rather than to a non-secret value such as a cache key or an ETag.',
    match: (line) =>
      /\b(md5|sha1|base64)\b/i.test(line) && /\b(password|passwd|pwd|secret|credential)\b/i.test(line),
  },
];

// --- configuration ---------------------------------------------------------

const DEFAULT_EXCLUDES = [
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  'vendor/',
  'coverage/',
  '.min.js',
  'package-lock.json',
  'bun.lock',
  'yarn.lock',
  'pnpm-lock.yaml',
];

/**
 * Reads only the three keys this tool needs out of .dpdpguard.yaml. A real
 * YAML parser is not worth a dependency here, and anything it cannot read
 * falls back to the documented default rather than failing the run.
 */
function readConfig(configPath) {
  const result = { excludes: [], ciFailOn: null, regulations: null };
  if (!fs.existsSync(configPath)) return result;

  let source;
  try {
    source = fs.readFileSync(configPath, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return result;
  }

  const failOn = source.match(/^\s{2,}ci_fail_on:\s*["']?([a-z]+)["']?/m);
  if (failOn) result.ciFailOn = failOn[1];

  const collectList = (key, indentedUnder) => {
    const pattern = new RegExp(`^${indentedUnder}${key}:\\s*\\n((?:\\s*-\\s*.*\\n?)+)`, 'm');
    const block = source.match(pattern);
    if (!block) return null;
    return block[1]
      .split('\n')
      .map((l) => l.match(/^\s*-\s*["']?([^"'#]+?)["']?\s*$/))
      .filter(Boolean)
      .map((m) => m[1].trim())
      .filter(Boolean);
  };

  result.excludes = collectList('exclude_paths', '\\s{2,}') || [];
  result.regulations = collectList('regulations', '');

  return result;
}

// --- file discovery --------------------------------------------------------

const SCANNED_EXTENSIONS = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.vue', '.svelte',
  '.py', '.rb', '.php', '.go', '.java', '.kt', '.kts', '.cs', '.rs',
  '.swift', '.scala', '.sql', '.prisma', '.sh', '.yml', '.yaml', '.json',
  '.env', '.tf', '.tfvars',
]);

const MAX_FILE_BYTES = 1024 * 1024;

function isExcluded(relPath, excludes) {
  const normalized = relPath.split(path.sep).join('/');
  return excludes.some((raw) => {
    const pattern = raw.trim();
    if (!pattern) return false;
    if (pattern.includes('*')) {
      const rx = new RegExp(
        `^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`,
      );
      return normalized.split('/').some((seg) => rx.test(seg)) || rx.test(normalized);
    }
    if (pattern.endsWith('/')) return normalized.startsWith(pattern) || normalized.includes(`/${pattern}`);
    return normalized === pattern || normalized.endsWith(pattern) || normalized.includes(`/${pattern}`);
  });
}

/** Tracked files if this is a git repo, otherwise a plain walk. */
function listFiles(dir) {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 32 * 1024 * 1024,
    });
    const files = out.split('\0').filter(Boolean);
    if (files.length) return files;
  } catch {
    /* not a git repo, or git unavailable — fall through to a walk */
  }

  const found = [];
  const walk = (current) => {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        walk(full);
      } else if (entry.isFile()) {
        found.push(path.relative(dir, full).split(path.sep).join('/'));
      }
    }
  };
  walk(dir);
  return found;
}

// --- scan ------------------------------------------------------------------

function scan(dir, activeRules, excludes) {
  const candidates = [];
  let filesScanned = 0;

  for (const relPath of listFiles(dir)) {
    if (!SCANNED_EXTENSIONS.has(path.extname(relPath).toLowerCase())) continue;
    if (isExcluded(relPath, excludes)) continue;

    const full = path.join(dir, relPath);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) continue;

    let source;
    try {
      const buffer = fs.readFileSync(full);
      // A NUL byte in the head is the cheap binary test.
      if (buffer.subarray(0, 8192).includes(0)) continue;
      source = buffer.toString('utf8');
    } catch {
      continue;
    }

    filesScanned++;
    const lines = source.split(/\r?\n/);

    for (const rule of activeRules) {
      if (rule.skipFile && rule.skipFile(relPath)) continue;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('dpdpguard:allow')) continue;
        if (!rule.match(line)) continue;

        candidates.push({
          rule,
          file: relPath,
          line: i + 1,
          excerpt: line.trim().slice(0, 200),
        });
      }
    }
  }

  return { candidates, filesScanned };
}

// --- reporting -------------------------------------------------------------

function ghEscape(value) {
  return String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function main() {
  const config = readConfig(path.join(rootDir, inputs.config));

  // Explicit action inputs win; the config file supplies the default.
  const failOn = (process.env['INPUT_FAIL-ON'] || config.ciFailOn || inputs.failOn).toLowerCase();
  const requested = (process.env.INPUT_REGULATIONS
    ? inputs.regulations.split(',')
    : config.regulations || inputs.regulations.split(',')
  )
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);

  const excludes = [...DEFAULT_EXCLUDES, ...config.excludes];
  const activeRules = RULES.filter((rule) => rule.regulations.some((r) => requested.includes(r)));

  console.log('DPDPGuard CI auditor');
  console.log(`  path:        ${rootDir}`);
  console.log(`  regulations: ${requested.join(',') || '(none)'}`);
  console.log(`  fail-on:     ${failOn}`);
  console.log(`  config:      ${inputs.config}`);
  console.log(
    `  rules:       ${activeRules.length} of ${RULES.length} implemented (catalog has 26; the rest need code read in context)`,
  );
  console.log('');

  if (activeRules.length === 0) {
    const notice =
      `No implemented rule is cited under the requested regulation(s) (${requested.join(',') || 'none'}). ` +
      'All five implemented rules are cited under DPDP and GDPR. Nothing was scanned.';
    console.log(`::warning title=DPDPGuard executed no rules::${ghEscape(notice)}`);
    console.log(`WARNING: ${notice}`);
    return 0;
  }

  const { candidates, filesScanned } = scan(rootDir, activeRules, excludes);

  const threshold = SEVERITY_ORDER.indexOf(failOn);
  const blocking =
    failOn === 'never' || threshold === -1
      ? []
      : candidates.filter((c) => SEVERITY_ORDER.indexOf(c.rule.severity) >= threshold);

  for (const c of candidates) {
    const level =
      failOn !== 'never' && threshold !== -1 && SEVERITY_ORDER.indexOf(c.rule.severity) >= threshold
        ? 'error'
        : 'warning';
    const message = `${c.rule.title} — ${c.rule.statute}. Candidate, not a finding: ${c.rule.confirm}`;
    console.log(
      `::${level} file=${c.file},line=${c.line},title=${c.rule.id}::${ghEscape(message)}`,
    );
    console.log(`  ${c.file}:${c.line}  [${c.rule.id}] ${c.rule.severity} — ${c.rule.title}`);
    console.log(`      ${c.excerpt}`);
  }

  const bySeverity = {};
  for (const c of candidates) {
    bySeverity[c.rule.severity] = (bySeverity[c.rule.severity] || 0) + 1;
  }
  const counts = SEVERITY_ORDER.slice()
    .reverse()
    .filter((s) => bySeverity[s])
    .map((s) => `${bySeverity[s]} ${s}`)
    .join(', ');

  console.log('');
  console.log(`Scanned ${filesScanned} file(s). ${candidates.length} candidate(s)${counts ? `: ${counts}` : ''}.`);

  const coverage =
    `Executed ${activeRules.length} of the 26 rules in the audit catalog — the pattern-matchable subset. ` +
    'The remaining rules (consent design, retention bindings, erasure reach, notice disclosures, ' +
    "children's data, rights endpoints) require reading code in context: run /dpdp-audit in Claude Code. " +
    'Every candidate above needs its confirmation step before it is recorded as a finding, and a clean ' +
    'run does not establish that an organisation is compliant.';
  console.log('');
  console.log(coverage);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = candidates
      .map((c) => `| \`${c.file}:${c.line}\` | ${c.rule.id} | ${c.rule.severity} | ${c.rule.title} |`)
      .join('\n');
    const summary = [
      '### DPDPGuard audit',
      '',
      `Scanned **${filesScanned}** file(s) against **${activeRules.length}** of 26 catalog rules.`,
      '',
      candidates.length
        ? ['| Location | Rule | Severity | Title |', '|---|---|---|---|', rows].join('\n')
        : 'No candidates matched.',
      '',
      `> ${coverage}`,
      '',
    ].join('\n');
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    } catch {
      /* summary is best-effort */
    }
  }

  if (blocking.length) {
    console.log('');
    console.log(
      `FAILED: ${blocking.length} candidate(s) at or above '${failOn}'. Confirm or annotate each one ` +
        "(add 'dpdpguard:allow' to an intentional line), then re-run.",
    );
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { RULES, scan, readConfig, isExcluded };
