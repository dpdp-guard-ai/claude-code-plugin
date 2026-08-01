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
organization:
  id: ""
  name: "My App"
  sector: "technology"
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
  supported_locales: ["en", "hi", "ta", "te", "bn", "mr", "gu", "kn", "ml"]

mcp:
  enabled: true
  api_url: "https://mcp.dpdpguard.com/v1"

telemetry:
  enabled: true
`;
  fs.writeFileSync(configPath, defaultConfig);
  console.log('✅ Created .dpdpguard.yaml configuration');
}

console.log('✅ DPDPGuard Claude Code Plugin initialized successfully!');
console.log('📊 Telemetry Notice: DPDPGuard collects anonymized usage metrics (rule hit rates). Disable in .dpdpguard.yaml or DPDPGUARD_TELEMETRY=false');
