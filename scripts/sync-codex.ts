import fs from 'fs';
import path from 'path';

/**
 * Synchronizes `.claude-plugin/plugin.json` to `.codex-plugin/plugin.json`
 * following the bstack build pipeline.
 */

const projectRoot = path.join(__dirname, '..');
const claudePluginPath = path.join(projectRoot, 'plugins/dpdpguard/.claude-plugin/plugin.json');
const codexPluginPath = path.join(projectRoot, 'plugins/dpdpguard/.codex-plugin/plugin.json');

if (fs.existsSync(claudePluginPath)) {
  const claudeContent = JSON.parse(fs.readFileSync(claudePluginPath, 'utf8'));

  const codexContent = {
    name: claudeContent.name,
    version: claudeContent.version,
    display_name: claudeContent.display_name,
    description: claudeContent.description,
    entry: {
      skills_dir: claudeContent.entry.skills,
      agents_dir: claudeContent.entry.agents,
    },
    requires: {
      tools: ['shell', 'file_read', 'file_write'],
      mcp: claudeContent.requires?.mcp || [],
    },
    compatibility: {
      min_codex_version: '0.1.0',
      supported_runtimes: ['node', 'bun'],
    },
    codex_specific: {
      sandbox_policy: 'relaxed',
      auto_approve_tools: ['shell', 'file_read'],
    },
    generated_from: '.claude-plugin/plugin.json',
    generated_at: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(codexPluginPath), { recursive: true });
  fs.writeFileSync(codexPluginPath, JSON.stringify(codexContent, null, 2) + '\n');
  console.log('✅ Synchronized Codex plugin manifest successfully.');
}
