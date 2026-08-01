import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  REQUIRED_KEYS,
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

  test('is executable', () => {
    expect(fs.statSync(hook).mode & 0o111).toBeGreaterThan(0);
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
