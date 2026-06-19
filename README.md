# EQA Readiness Platform

Multi-tenant SaaS for EQA readiness assessments. This repository is a pnpm
monorepo. **Step 1 is skeleton, tooling, and package boundaries only — no
feature code yet.**

## Stack

- **Next.js (App Router) + TypeScript** for the web app (`apps/web`).
- **pnpm workspaces** for the monorepo.
- **TypeScript strict mode**, **ESLint** (flat config) + **Prettier**.
- **Vitest** for tests.
- **GitHub Actions** CI: lint, type-check, tests, and secret scanning.

## Layout

```
.
├─ apps/
│  └─ web/                 # Next.js App Router app (includes /health route)
├─ packages/               # Shared packages — feature code depends on these,
│  ├─ db/                  #   and must not reach around their public entry point
│  ├─ auth/
│  ├─ audit-log/
│  ├─ tenant/
│  ├─ storage/
│  ├─ ai/
│  ├─ content/
│  ├─ workflows/
│  ├─ jobs/
│  └─ crypto/
├─ tools/secret-scan/      # gitleaks fixtures + docs
├─ .github/workflows/      # CI
├─ eslint.config.mjs       # Flat config incl. package-boundary rules
├─ tsconfig.base.json      # Shared compiler options + @eqa/* path aliases
└─ vitest.config.ts
```

Each package exposes a single public entry point (`src/index.ts`) and is
imported by its `@eqa/<name>` alias. The dependency direction is enforced by
ESLint (`eslint-plugin-boundaries`):

- The app may depend on shared packages.
- Shared packages may depend on other shared packages but **never** on app code.
- Other packages may only be imported through their `index.ts` — no reaching
  into internals.

## Local development

```bash
pnpm install
pnpm dev            # start the web app (http://localhost:3000)

pnpm lint           # eslint
pnpm type-check     # tsc --noEmit across the workspace
pnpm test           # vitest
pnpm format         # prettier --write
```

Liveness probe: `GET /health` → `{ "status": "ok", ... }`.

## Secrets

No secrets in the repo. `.env` is git-ignored; required variables are documented
in [`.env.example`](./.env.example). Secret scanning uses gitleaks — see
[`tools/secret-scan/README.md`](./tools/secret-scan/README.md).
