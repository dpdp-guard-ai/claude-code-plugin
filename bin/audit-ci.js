#!/usr/bin/env node

/**
 * CI auditor entrypoint for @dpdpguard/claude-code-plugin.
 * Invoked by the GitHub Action in action.yml, or directly from a CLI.
 *
 * PLACEHOLDER: the rule catalog is not executed here yet. The detection logic
 * currently lives in the plugin skills, which run inside Claude Code.
 *
 * This exits 0 so it does not break existing pipelines, but it deliberately
 * does NOT report a passing audit — claiming "0 findings" without scanning
 * anything is a false assurance, which is worse in a compliance tool than
 * having no gate at all.
 */

const IMPLEMENTED = false;

const inputs = {
  regulations: process.env.INPUT_REGULATIONS || 'dpdp,gdpr,ccpa,pdpa',
  failOn: process.env['INPUT_FAIL-ON'] || 'high',
  config: process.env.INPUT_CONFIG || '.dpdpguard.yaml',
};

console.log('DPDPGuard CI auditor');
console.log(`  regulations: ${inputs.regulations}`);
console.log(`  fail-on:     ${inputs.failOn}`);
console.log(`  config:      ${inputs.config}`);
console.log('');

if (!IMPLEMENTED) {
  const notice =
    'No rules were executed — this entrypoint is a placeholder and did not audit anything. ' +
    'Do not treat this step as a compliance gate. ' +
    'Run /dpdp-audit inside Claude Code for an actual audit.';

  console.log(`::warning title=DPDPGuard audit not executed::${notice}`);
  console.log(`WARNING: ${notice}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    require('node:fs').appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### DPDPGuard\n\n:warning: ${notice}\n`,
    );
  }

  process.exit(0);
}
