module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'dpdpguard',
        'audit',
        'consent',
        'dsr',
        'breach',
        'retention',
        'child-protection',
        'mcp',
        'ci',
        'docs',
        'deps',
      ],
    ],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'ci', 'perf', 'style'],
    ],
  },
};
