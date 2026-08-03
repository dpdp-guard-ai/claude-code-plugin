#!/usr/bin/env node

/**
 * Initializer script for @dpdpguard/claude-code-plugin
 * Bootstraps plugin configuration and skills in target project.
 */

const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
console.log('🛡️ Initializing DPDPGuard Claude Code Plugin...');

// 1. Create .dpdpguard.yaml if not present
const configPath = path.join(cwd, '.dpdpguard.yaml');
if (!fs.existsSync(configPath)) {
  const defaultConfig = `version: 2

# The tenant is authoritative for organisation identity. When MCP is
# configured, these are read from org_profile_get — the credential is already
# org-scoped, so there is nothing to restate here. Fill them in only for
# offline work, and expect the plugin to surface any divergence rather than
# silently preferring one side.
organization:
  id: ""
  name: ""
  sector: ""
  # Gates DPO appointment, DPIA and independent audit under DPDP §10. If this
  # disagrees with the tenant, every artefact built from it targets the wrong
  # obligation set.
  isSignificantDataFiduciary: false

regulations:
  - dpdp
  - gdpr
  - ccpa
  - pdpa

audit:
  severity_threshold: "medium"
  remote_rules: true
  ci_fail_on: "high"
  exclude_paths:
    - "node_modules/"
    - "dist/"
    - "*.test.*"

consent:
  default_locale: "en"
  # List only locales that are genuinely translated. A switcher offering a
  # language that silently falls back to English is misleading. Also held by
  # the tenant; the tenant wins when both are present.
  supported_locales: ["en"]

mcp:
  enabled: true
  # The agent surface is per-deployment: <your tenant base URL>/mcp/v1.
  # Read the base URL from your DPDPGuard dashboard — there is no shared host.
  api_url: ""

telemetry:
  # Off by default. A privacy-compliance tool that ships outbound telemetry
  # enabled is the first thing a security review objects to. Opt in explicitly
  # if you want to contribute anonymised rule-hit metrics.
  enabled: false
`;
  fs.writeFileSync(configPath, defaultConfig);
  console.log('✅ Created .dpdpguard.yaml configuration');
}

console.log('✅ DPDPGuard Claude Code Plugin initialized successfully!');
console.log('📊 Telemetry Notice: telemetry is DISABLED by default. Set telemetry.enabled: true in .dpdpguard.yaml to contribute anonymized rule-hit metrics.');
