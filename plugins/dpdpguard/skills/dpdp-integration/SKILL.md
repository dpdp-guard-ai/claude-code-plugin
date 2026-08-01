---
name: dpdp-integration
description: Scaffolding wizard for adding DPDPGuard SDK to React, Node, React Native, Flutter, Swift, or Kotlin apps
triggers:
  - dpdp integrate
  - add dpdpguard
  - setup sdk
  - integrate privacy
---

# DPDPGuard SDK Integration Wizard

Guide developers through integrating the `@dpdpguard/sdk` into any application stack.

## Supported Frameworks

- **Web**: React, Next.js, Remix, Vue, Angular, Svelte
- **Mobile**: React Native, Flutter, iOS (Swift), Android (Kotlin)
- **Backend**: Node.js, Express, Fastify, Convex, Python (FastAPI/Django), Go

## Scaffolding Workflow

1. **Framework Detection**: Inspect `package.json`, `pubspec.yaml`, `build.gradle`, or `Package.swift`.
2. **Provider Injection**: Wrap app root with `DPDPProvider` context.
3. **API Key Setup**: Inject `DPDPGUARD_CLIENT_KEY` environment variable.
4. **Scaffold Components**: Generate baseline consent banner, privacy notice route, and DSR request handler.
5. **Verification**: Run dry-run verification scan to ensure zero runtime integration errors.
