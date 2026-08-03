import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  REQUIRED_KEYS,
  isExecutable,
  listPlugins,
  markdownFiles,
  parseFrontmatter,
  projectRoot,
  skillFiles,
  validate,
} from '../scripts/validate-plugin';

describe('frontmatter parser', () => {
  test('parses scalars and block sequences', () => {
    const { frontmatter, body } = parseFrontmatter(
      ['---', 'name: demo', 'triggers:', '  - one', '  - two', '---', '', '# Body'].join('\n'),
    );

    expect(frontmatter.name).toBe('demo');
    expect(frontmatter.triggers).toEqual(['one', 'two']);
    expect(body.trim()).toBe('# Body');
  });

  test('strips surrounding quotes', () => {
    const { frontmatter } = parseFrontmatter('---\nhint: "[a|b]"\n---\nbody\n');
    expect(frontmatter.hint).toBe('[a|b]');
  });

  test('rejects a file with no frontmatter', () => {
    expect(() => parseFrontmatter('# Just markdown\n')).toThrow(/missing YAML frontmatter/);
  });

  test('rejects unterminated frontmatter', () => {
    expect(() => parseFrontmatter('---\nname: x\n')).toThrow(/unterminated/);
  });
});

describe('plugin validation', () => {
  const issues = validate();

  test('repository has no validation errors', () => {
    const errors = issues.filter((i) => i.level === 'error');
    expect(errors.map((e) => `${e.file}: ${e.message}`)).toEqual([]);
  });

  test('at least one plugin is present', () => {
    expect(listPlugins().length).toBeGreaterThan(0);
  });
});

describe('document frontmatter', () => {
  const plugins = listPlugins();

  for (const plugin of plugins) {
    const cases: Array<[keyof typeof REQUIRED_KEYS, string[]]> = [
      ['skill', skillFiles(plugin)],
      ['agent', markdownFiles(plugin, 'agents')],
      ['command', markdownFiles(plugin, 'commands')],
    ];

    for (const [kind, files] of cases) {
      test(`${plugin}: ${kind}s exist`, () => {
        expect(files.length).toBeGreaterThan(0);
      });

      for (const file of files) {
        const rel = path.relative(projectRoot, file);

        test(`${rel} has required ${kind} frontmatter`, () => {
          const { frontmatter } = parseFrontmatter(fs.readFileSync(file, 'utf8'), file);
          for (const key of REQUIRED_KEYS[kind]) {
            expect(frontmatter[key]).toBeDefined();
          }
        });

        test(`${rel} does not use the invalid 'allowed_tools' key`, () => {
          const { frontmatter } = parseFrontmatter(fs.readFileSync(file, 'utf8'), file);
          expect(frontmatter.allowed_tools).toBeUndefined();
        });
      }
    }
  }
});

describe('codex sync', () => {
  test('committed codex artefacts are up to date', async () => {
    const proc = Bun.spawn(['bun', 'run', 'scripts/sync-codex.ts', '--check'], {
      cwd: projectRoot,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const stderr = await new Response(proc.stderr).text();
    expect(await proc.exited, stderr).toBe(0);
  });

  test('sync output is deterministic across runs', async () => {
    const generated = path.join(projectRoot, 'plugins/dpdpguard/.codex-plugin/plugin.json');
    const before = fs.readFileSync(generated, 'utf8');

    const proc = Bun.spawn(['bun', 'run', 'scripts/sync-codex.ts'], {
      cwd: projectRoot,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await proc.exited;

    expect(fs.readFileSync(generated, 'utf8')).toBe(before);
  });
});

describe('pii-commit-guard hook', () => {
  const hook = path.join(projectRoot, 'plugins/dpdpguard/hooks/pii-commit-guard.sh');

  /** Run the hook against a staged file, returning its exit code. */
  async function runGuard(command: string, staged?: { name: string; content: string }) {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'dpdpguard-hook-'));
    try {
      for (const args of [
        ['init', '-q', '.'],
        ['config', 'user.email', 'test@example.com'],
        ['config', 'user.name', 'test'],
      ]) {
        await Bun.spawn(['git', ...args], { cwd: repo, stdout: 'ignore', stderr: 'ignore' }).exited;
      }

      if (staged) {
        fs.writeFileSync(path.join(repo, staged.name), staged.content);
        await Bun.spawn(['git', 'add', staged.name], {
          cwd: repo,
          stdout: 'ignore',
          stderr: 'ignore',
        }).exited;
      }

      const proc = Bun.spawn(['sh', hook], {
        cwd: repo,
        stdin: new TextEncoder().encode(
          JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
        ),
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const stderr = await new Response(proc.stderr).text();
      return { code: await proc.exited, stderr };
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  }

  // Checks the git index mode on Windows, where there are no permission bits.
  test('is executable', () => {
    expect(isExecutable(hook)).toBe(true);
  });

  test('allows commands that are not commits', async () => {
    expect((await runGuard('ls -la')).code).toBe(0);
  });

  test('allows a clean commit', async () => {
    const result = await runGuard('git commit -m ok', {
      name: 'ok.js',
      content: 'export const sum = (a, b) => a + b;\n',
    });
    expect(result.code).toBe(0);
  });

  test('blocks personal data in a console statement', async () => {
    const result = await runGuard('git commit -m bad', {
      name: 'bad.js',
      content: 'console.log("login: " + user.email);\n',
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('console statement');
  });

  test('blocks private key material', async () => {
    const result = await runGuard('git commit -m key', {
      name: 'id.pem',
      content: '-----BEGIN RSA PRIVATE KEY-----\nabc\n',
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('private key');
  });

  test('blocks a DPDPGuard service key', async () => {
    const result = await runGuard('git commit -m key', {
      name: 'config.js',
      content: 'const client = init("dpdpg_live_8fK2mQ7xR4tZ9wB1nL5c");\n',
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('DPDPGuard credential');
  });

  test('blocks a DPDPGuard agent key', async () => {
    const result = await runGuard('git commit -m key', {
      name: '.mcp.json',
      content: '{ "token": "dpdpg_agent_3vT8pW2yH6kD0sJ4qX7b" }\n',
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('DPDPGuard credential');
  });

  test('blocks an Aadhaar-shaped literal', async () => {
    const result = await runGuard('git commit -m id', {
      name: 'id.js',
      content: 'const uid = "4321 8765 2109";\n',
    });
    expect(result.code).toBe(2);
  });

  test('blocks --no-verify', async () => {
    const result = await runGuard('git commit --no-verify -m skip');
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('--no-verify');
  });

  test('honours the dpdpguard:allow escape hatch', async () => {
    const result = await runGuard('git commit -m fixture', {
      name: 'fixture.js',
      content: 'console.log(user.email); // dpdpguard:allow\n',
    });
    expect(result.code).toBe(0);
  });

  test('detects commits behind git global options', async () => {
    const result = await runGuard('git -c user.name=x commit -m bad', {
      name: 'bad.js',
      content: 'console.log("email: " + u.email);\n',
    });
    expect(result.code).toBe(2);
  });

  test('does not scan commands that merely mention commit', async () => {
    const result = await runGuard('git log --grep commit', {
      name: 'bad.js',
      content: 'console.log(user.email);\n',
    });
    expect(result.code).toBe(0);
  });

  test('fails open on an unparseable payload', async () => {
    const proc = Bun.spawn(['sh', hook], {
      stdin: new TextEncoder().encode('not json'),
      stdout: 'ignore',
      stderr: 'ignore',
    });
    expect(await proc.exited).toBe(0);
  });
});

describe('CI auditor', () => {
  const auditor = path.join(projectRoot, 'bin/audit-ci.js');

  /** Run the auditor over a throwaway tree, returning its exit code and stdout. */
  async function runAudit(
    files: Record<string, string>,
    env: Record<string, string> = {},
  ) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dpdpguard-audit-'));
    try {
      for (const [name, content] of Object.entries(files)) {
        const target = path.join(dir, name);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
      }

      const proc = Bun.spawn(['node', auditor, dir], {
        env: { ...process.env, ...env },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const stdout = await new Response(proc.stdout).text();
      return { code: await proc.exited, stdout };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  test('passes on a clean tree', async () => {
    const result = await runAudit({ 'ok.js': 'export const sum = (a, b) => a + b;\n' });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('0 candidate(s)');
  });

  // CLAUDE.md: never state that an organisation "is compliant" — that is a
  // regulator's determination. Any sentence mentioning compliance must negate.
  test('never reports a clean run as compliant', async () => {
    const result = await runAudit({ 'ok.js': 'export const x = 1;\n' });
    expect(result.stdout).toContain('does not establish that an organisation is compliant');

    const claims = result.stdout
      .split(/(?<=\.)\s+/)
      .filter((sentence) => /\bcompliant\b/i.test(sentence))
      .filter((sentence) => !/\bnot\b/i.test(sentence));
    expect(claims).toEqual([]);
  });

  test('discloses that it executes a subset of the catalog', async () => {
    const result = await runAudit({ 'ok.js': 'export const x = 1;\n' });
    expect(result.stdout).toContain('of the 26 rules');
    expect(result.stdout).toContain('/dpdp-audit');
  });

  test('DPDP-A01 — personal data in logs', async () => {
    const result = await runAudit({ 'a.js': 'console.log("user " + u.email);\n' });
    expect(result.stdout).toContain('DPDP-A01');
    expect(result.code).toBe(1);
  });

  test('DPDP-A02 — personal data in a query parameter', async () => {
    const result = await runAudit({ 'a.js': 'fetch("/api/u?email=" + e);\n' });
    expect(result.stdout).toContain('DPDP-A02');
  });

  test('DPDP-A05 — hardcoded credential and DPDPGuard key prefixes', async () => {
    const result = await runAudit({
      'a.js': 'const k = "sk-abcdefghijklmnop1234";\nconst s = "dpdpg_agent_3vT8pW2yH6kD0sJ4qX7b";\n',
    });
    expect(result.stdout).toContain('DPDP-A05');
    expect(result.stdout).toContain('a.js:1');
    expect(result.stdout).toContain('a.js:2');
  });

  test('DPDP-F01 — plaintext transport, but not localhost', async () => {
    const bad = await runAudit({ 'a.js': 'const u = "http://api.example.com";\n' });
    expect(bad.stdout).toContain('DPDP-F01');

    const dev = await runAudit({ 'a.js': 'const u = "http://localhost:3000";\n' });
    expect(dev.stdout).not.toContain('DPDP-F01');
  });

  test('DPDP-F02 — reversible password storage', async () => {
    const result = await runAudit({ 'a.js': 'const h = md5(password);\n' });
    expect(result.stdout).toContain('DPDP-F02');
  });

  test('ignores placeholder credentials', async () => {
    const result = await runAudit({ 'a.js': 'const api_key = "your_api_key_here";\n' });
    expect(result.code).toBe(0);
  });

  test('honours the dpdpguard:allow escape hatch', async () => {
    const result = await runAudit({ 'a.js': 'console.log(u.email); // dpdpguard:allow\n' });
    expect(result.code).toBe(0);
  });

  test('skips credentials in .example files', async () => {
    const result = await runAudit({ '.env.example': 'API_KEY="sk-abcdefghijklmnop1234"\n' });
    expect(result.stdout).not.toContain('DPDP-A05');
  });

  test('does not scan documentation', async () => {
    const result = await runAudit({ 'README.md': 'console.log(user.email)\n' });
    expect(result.code).toBe(0);
  });

  test('fail-on never reports without failing the build', async () => {
    const result = await runAudit(
      { 'a.js': 'console.log(u.email);\n' },
      { 'INPUT_FAIL-ON': 'never' },
    );
    expect(result.stdout).toContain('DPDP-A01');
    expect(result.code).toBe(0);
  });

  test('fail-on critical does not block a high-severity candidate', async () => {
    const result = await runAudit(
      { 'a.js': 'fetch("/api/u?email=" + e);\n' },
      { 'INPUT_FAIL-ON': 'critical' },
    );
    expect(result.stdout).toContain('DPDP-A02');
    expect(result.code).toBe(0);
  });

  test('honours exclude_paths from .dpdpguard.yaml', async () => {
    const result = await runAudit({
      '.dpdpguard.yaml': 'audit:\n  exclude_paths:\n    - "generated/"\n',
      'generated/a.js': 'console.log(u.email);\n',
    });
    expect(result.code).toBe(0);
  });

  test('says so loudly when no rule matches the requested regulations', async () => {
    const result = await runAudit(
      { 'a.js': 'console.log(u.email);\n' },
      { INPUT_REGULATIONS: 'ccpa' },
    );
    expect(result.stdout).toContain('Nothing was scanned');
    expect(result.code).toBe(0);
  });
});
