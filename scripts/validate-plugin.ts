#!/usr/bin/env bun
/**
 * Validates plugin structure against the rules in CLAUDE.md.
 *
 *   bun run validate
 *
 * Exits non-zero on any error. Warnings do not fail the run.
 *
 * The exported helpers are consumed by `test/plugin.test.ts`, so keep this
 * file free of side effects at import time — the CLI entrypoint is guarded by
 * `import.meta.main`.
 */

import fs from 'node:fs';
import path from 'node:path';

export const projectRoot = path.join(import.meta.dir, '..');
export const pluginsDir = path.join(projectRoot, 'plugins');

export interface Frontmatter {
  [key: string]: string | string[];
}

export interface ParsedDoc {
  file: string;
  frontmatter: Frontmatter;
  body: string;
}

/**
 * Minimal YAML frontmatter parser covering the subset used by plugin
 * documents: scalar values and block sequences. Deliberately dependency-free —
 * this runs in CI before anything is installed.
 */
export function parseFrontmatter(source: string, file = '<memory>'): ParsedDoc {
  if (!source.startsWith('---\n')) {
    throw new Error(`${file}: missing YAML frontmatter (file must start with '---')`);
  }

  const end = source.indexOf('\n---', 3);
  if (end === -1) {
    throw new Error(`${file}: unterminated YAML frontmatter`);
  }

  const block = source.slice(4, end);
  const body = source.slice(source.indexOf('\n', end + 1) + 1);
  const frontmatter: Frontmatter = {};

  let currentKey: string | null = null;

  for (const rawLine of block.split('\n')) {
    if (rawLine.trim() === '' || rawLine.trimStart().startsWith('#')) continue;

    const listItem = rawLine.match(/^\s+-\s+(.*)$/);
    if (listItem && currentKey) {
      const list = frontmatter[currentKey];
      const value = unquote(listItem[1].trim());
      if (Array.isArray(list)) list.push(value);
      else frontmatter[currentKey] = [value];
      continue;
    }

    const pair = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;

    const [, key, rawValue] = pair;
    currentKey = key;
    frontmatter[key] = rawValue.trim() === '' ? [] : unquote(rawValue.trim());
  }

  return { file, frontmatter, body };
}

function unquote(value: string): string {
  const match = value.match(/^(['"])(.*)\1$/s);
  return match ? match[2] : value;
}

export function listPlugins(): string[] {
  if (!fs.existsSync(pluginsDir)) return [];
  return fs
    .readdirSync(pluginsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function skillFiles(plugin: string): string[] {
  const dir = path.join(pluginsDir, plugin, 'skills');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(dir, e.name, 'SKILL.md'))
    .filter((p) => fs.existsSync(p))
    .sort();
}

export function markdownFiles(plugin: string, kind: 'agents' | 'commands'): string[] {
  const dir = path.join(pluginsDir, plugin, kind);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => path.join(dir, f))
    .sort();
}

export function hookScripts(plugin: string): string[] {
  const dir = path.join(pluginsDir, plugin, 'hooks');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sh'))
    .map((f) => path.join(dir, f))
    .sort();
}

// --- rules -----------------------------------------------------------------

/** Frontmatter keys required per CLAUDE.md, by document kind. */
export const REQUIRED_KEYS = {
  skill: ['name', 'description', 'triggers'],
  agent: ['name', 'description', 'model', 'tools'],
  command: ['name', 'description', 'triggers'],
} as const;

/** Bashisms that must not appear in hook scripts (CLAUDE.md rule 2). */
const BASHISMS: Array<[RegExp, string]> = [
  [/\[\[\s/, 'use [ ] instead of [[ ]]'],
  [/\blocal\s+\w+/, "'local' is not POSIX"],
  [/\bfunction\s+\w+\s*\(/, "use 'name() {' instead of 'function name()'"],
  [/<<</, 'here-strings are not POSIX'],
  [/\$\{[A-Za-z_][A-Za-z0-9_]*\[[@*]\]\}/, 'arrays are not POSIX'],
  [/\becho\s+-e\b/, "'echo -e' is not portable; use printf"],
  [/==/, "use '=' for string comparison in [ ]"],
];

export interface Issue {
  level: 'error' | 'warning';
  file: string;
  message: string;
}

export function validate(): Issue[] {
  const issues: Issue[] = [];
  const err = (file: string, message: string) =>
    issues.push({ level: 'error', file: path.relative(projectRoot, file), message });
  const warn = (file: string, message: string) =>
    issues.push({ level: 'warning', file: path.relative(projectRoot, file), message });

  const plugins = listPlugins();
  if (plugins.length === 0) err(pluginsDir, 'no plugins found under plugins/');

  const rootPkg = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
  );

  for (const plugin of plugins) {
    const pluginDir = path.join(pluginsDir, plugin);
    const manifestPath = path.join(pluginDir, '.claude-plugin/plugin.json');

    // -- manifest --
    if (!fs.existsSync(manifestPath)) {
      err(manifestPath, 'missing .claude-plugin/plugin.json');
      continue;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const key of ['name', 'version', 'description']) {
      if (!manifest[key]) err(manifestPath, `manifest missing required key '${key}'`);
    }
    if (manifest.name !== plugin) {
      err(manifestPath, `manifest name '${manifest.name}' does not match directory '${plugin}'`);
    }
    if (manifest.version !== rootPkg.version) {
      err(
        manifestPath,
        `version '${manifest.version}' does not match package.json version '${rootPkg.version}'`,
      );
    }

    // -- documents --
    const docs: Array<[keyof typeof REQUIRED_KEYS, string[]]> = [
      ['skill', skillFiles(plugin)],
      ['agent', markdownFiles(plugin, 'agents')],
      ['command', markdownFiles(plugin, 'commands')],
    ];

    for (const [kind, files] of docs) {
      const seen = new Map<string, string>();

      for (const file of files) {
        let doc: ParsedDoc;
        try {
          doc = parseFrontmatter(fs.readFileSync(file, 'utf8'), file);
        } catch (e) {
          err(file, (e as Error).message);
          continue;
        }

        for (const key of REQUIRED_KEYS[kind]) {
          const value = doc.frontmatter[key];
          if (value === undefined || (Array.isArray(value) && value.length === 0) || value === '') {
            err(file, `${kind} frontmatter missing required key '${key}'`);
          }
        }

        const name = doc.frontmatter.name;
        if (typeof name === 'string') {
          if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
            err(file, `name '${name}' must be lowercase kebab-case`);
          }

          // Skill directory and command filename must match the declared name,
          // otherwise the document is unreachable by that name.
          const expected =
            kind === 'skill' ? path.basename(path.dirname(file)) : path.basename(file, '.md');
          if (name !== expected) {
            err(file, `name '${name}' does not match ${kind === 'skill' ? 'directory' : 'filename'} '${expected}'`);
          }

          const duplicate = seen.get(name);
          if (duplicate) err(file, `duplicate ${kind} name '${name}' (also in ${duplicate})`);
          seen.set(name, path.relative(projectRoot, file));
        }

        const description = doc.frontmatter.description;
        if (typeof description === 'string' && description.length < 20) {
          warn(file, 'description is very short; it drives model-side triggering');
        }

        if (doc.body.trim().length < 100) {
          warn(file, `${kind} body is nearly empty`);
        }

        // Agents declare tools as a comma-separated string in Claude Code.
        if (kind === 'agent' && Array.isArray(doc.frontmatter.tools)) {
          warn(file, "agent 'tools' should be a comma-separated string, not a YAML list");
        }

        // `allowed_tools` is not a recognised key; the real one is hyphenated.
        if (doc.frontmatter.allowed_tools !== undefined) {
          err(file, "use 'allowed-tools' (hyphen), not 'allowed_tools'");
        }
      }
    }

    // -- hooks --
    const hooksJson = path.join(pluginDir, 'hooks/hooks.json');
    if (fs.existsSync(hooksJson)) {
      const hooks = JSON.parse(fs.readFileSync(hooksJson, 'utf8'));

      if (Array.isArray(hooks.hooks)) {
        err(hooksJson, "'hooks' must be an object keyed by event name, not an array");
      } else if (hooks.hooks && typeof hooks.hooks === 'object') {
        for (const [event, matchers] of Object.entries(hooks.hooks)) {
          for (const matcher of matchers as Array<Record<string, unknown>>) {
            const entries = matcher.hooks as Array<Record<string, unknown>> | undefined;
            if (!Array.isArray(entries)) {
              err(hooksJson, `${event}: matcher entry missing a 'hooks' array`);
              continue;
            }
            for (const entry of entries) {
              if (entry.type !== 'command') {
                err(hooksJson, `${event}: hook type must be 'command'`);
              }
              const command = String(entry.command ?? '');
              if (!command) {
                err(hooksJson, `${event}: hook missing 'command'`);
                continue;
              }
              if (!command.includes('${CLAUDE_PLUGIN_ROOT}')) {
                warn(
                  hooksJson,
                  `${event}: hook command should be rooted at \${CLAUDE_PLUGIN_ROOT} to resolve when installed`,
                );
              }
              const referenced = command.replace('${CLAUDE_PLUGIN_ROOT}', pluginDir);
              if (referenced.startsWith('/') && !fs.existsSync(referenced)) {
                err(hooksJson, `${event}: hook script not found at ${command}`);
              }
            }
          }
        }
      }
    }

    for (const script of hookScripts(plugin)) {
      const source = fs.readFileSync(script, 'utf8');

      if (!source.startsWith('#!')) err(script, 'hook script missing shebang');
      else if (/^#!.*\bbash\b/.test(source)) {
        err(script, 'hook scripts must be POSIX sh, not bash (CLAUDE.md rule 2)');
      }

      try {
        if (!(fs.statSync(script).mode & 0o111)) {
          err(script, 'hook script is not executable (chmod +x)');
        }
      } catch {
        /* stat failure is reported elsewhere */
      }

      for (const [pattern, message] of BASHISMS) {
        for (const [i, line] of source.split('\n').entries()) {
          // Skip comments — the guidance itself mentions these constructs.
          if (line.trimStart().startsWith('#')) continue;
          if (pattern.test(line)) {
            warn(script, `line ${i + 1}: possible bashism — ${message}`);
            break;
          }
        }
      }
    }
  }

  // -- marketplace catalog --
  const marketplacePath = path.join(projectRoot, '.claude-plugin/marketplace.json');
  if (!fs.existsSync(marketplacePath)) {
    err(marketplacePath, 'missing .claude-plugin/marketplace.json');
  } else {
    const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
    for (const entry of marketplace.plugins ?? []) {
      const target = path.join(projectRoot, entry.path);
      if (!fs.existsSync(target)) {
        err(marketplacePath, `catalog entry '${entry.name}' points at missing path '${entry.path}'`);
      }
      if (!listPlugins().includes(entry.name)) {
        err(marketplacePath, `catalog entry '${entry.name}' has no matching plugin directory`);
      }
    }
    for (const plugin of listPlugins()) {
      if (!(marketplace.plugins ?? []).some((p: { name: string }) => p.name === plugin)) {
        err(marketplacePath, `plugin '${plugin}' is not listed in the marketplace catalog`);
      }
    }
  }

  return issues;
}

if (import.meta.main) {
  const issues = validate();
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  for (const issue of warnings) console.warn(`warning  ${issue.file}: ${issue.message}`);
  for (const issue of errors) console.error(`error    ${issue.file}: ${issue.message}`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exit(1);
  }

  console.log(
    `Plugin validation passed (${listPlugins().length} plugin(s), ${warnings.length} warning(s)).`,
  );
}
