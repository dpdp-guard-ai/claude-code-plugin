#!/usr/bin/env bun
/**
 * Generates `.codex-plugin/plugin.json` from `.claude-plugin/plugin.json`
 * for every plugin under `plugins/`, and mirrors the marketplace catalog into
 * `.agents/plugins/marketplace.json`.
 *
 * The output is a pure function of the source manifests — no timestamps, no
 * randomness. CI checks for drift by running this and diffing, so any
 * non-deterministic field would make that check impossible to pass.
 *
 *   bun run sync:codex          # write
 *   bun run sync:codex --check  # exit 1 if anything is out of date
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const projectRoot = path.join(import.meta.dir, '..');
const pluginsDir = path.join(projectRoot, 'plugins');
const checkOnly = process.argv.includes('--check');

const drifted: string[] = [];

/** Write `content` to `file`, or record drift when running with --check. */
function emit(file: string, content: string): void {
  const rel = path.relative(projectRoot, file);
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;

  if (current === content) return;

  if (checkOnly) {
    drifted.push(rel);
    return;
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`  synced ${rel}`);
}

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** Map a Claude tool name onto its Codex equivalent. */
const TOOL_MAP: Record<string, string> = {
  Bash: 'shell',
  Read: 'file_read',
  Write: 'file_write',
  Edit: 'file_write',
  Grep: 'file_search',
  Glob: 'file_search',
};

function toCodexTools(claudeTools: string[] | undefined): string[] {
  const mapped = (claudeTools ?? []).map((t) => TOOL_MAP[t] ?? t.toLowerCase());
  return [...new Set(mapped)].sort();
}

// --- per-plugin manifests --------------------------------------------------

const pluginNames = fs.existsSync(pluginsDir)
  ? fs
      .readdirSync(pluginsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  : [];

for (const name of pluginNames) {
  const source = path.join(pluginsDir, name, '.claude-plugin/plugin.json');
  if (!fs.existsSync(source)) continue;

  const raw = fs.readFileSync(source, 'utf8');
  const claude = JSON.parse(raw);

  const codex = {
    name: claude.name,
    version: claude.version,
    display_name: claude.display_name,
    description: claude.description,
    entry: {
      skills_dir: claude.entry?.skills,
      agents_dir: claude.entry?.agents,
    },
    requires: {
      tools: toCodexTools(claude.requires?.tools),
      mcp: claude.requires?.mcp ?? [],
    },
    compatibility: {
      min_codex_version: '0.1.0',
      supported_runtimes: ['node', 'bun'],
    },
    codex_specific: {
      sandbox_policy: 'workspace-write',
      auto_approve_tools: ['file_read', 'file_search'],
    },
    generated_from: '.claude-plugin/plugin.json',
    // Deterministic provenance: identifies the exact source this was built
    // from without embedding a timestamp.
    source_checksum: `sha256:${crypto.createHash('sha256').update(raw).digest('hex')}`,
  };

  emit(path.join(pluginsDir, name, '.codex-plugin/plugin.json'), json(codex));
}

// --- marketplace catalog ---------------------------------------------------

const marketplaceSource = path.join(projectRoot, '.claude-plugin/marketplace.json');
if (fs.existsSync(marketplaceSource)) {
  emit(
    path.join(projectRoot, '.agents/plugins/marketplace.json'),
    fs.readFileSync(marketplaceSource, 'utf8'),
  );
}

// --- result ----------------------------------------------------------------

if (checkOnly) {
  if (drifted.length > 0) {
    console.error('Codex artefacts are out of date:');
    for (const file of drifted) console.error(`  - ${file}`);
    console.error("\nRun 'bun run sync:codex' and commit the result.");
    process.exit(1);
  }
  console.log(`Codex artefacts up to date (${pluginNames.length} plugin(s)).`);
} else {
  console.log(`Codex sync complete (${pluginNames.length} plugin(s)).`);
}
