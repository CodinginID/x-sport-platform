# Branch Strategy & CI/CD Guide

## Branch Structure

```
production  ← stable, deployed to prod
  ↑
main        ← always deployable, merged to production manually
  ↑
feature/*   ← new features (feature/member-crud, feature/booking-flow)
fix/*       ← bug fixes (fix/login-error, fix/payment-calc)
hotfix/*    ← urgent prod fixes (hotfix/payment-crash)
```

## Workflow

### 1. Development (feature/fix branches)
```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# Work, commit, push
git add .
git commit -m "feat: add member export to PDF"
git push -u origin feature/your-feature-name
```

CI runs automatically on push:
- Type check (`tsc --noEmit`)
- Unit tests (54 tests)
- Production build

### 2. Pull Request to main
- Open PR from `feature/*` → `main`
- CI must pass (lint + test + build)
- Code review required
- Merge when approved

### 3. Deploy to Production
```bash
# After main is verified, merge to production
git checkout production
git pull origin production
git merge main
git push origin production
```

### 4. Hotfix (urgent fix)
```bash
# Create from production
git checkout production
git checkout -b hotfix/critical-bug

# Fix and push
git push -u origin hotfix/critical-bug

# PR to BOTH main and production
# Merge to production first, then main
```

## CI/CD Pipeline

| Job | Runs On | Purpose |
|-----|---------|---------|
| lint | All branches | TypeScript type checking |
| test | All branches | 54 unit tests |
| build | All branches | Production build verification |
| deploy-preview | Pull requests | Preview deployment |
| deploy-production | main branch only | Production deployment |

## Rules to Prevent Prod Errors

1. **Never push directly to `main` or `production`** — always use PRs
2. **CI must pass** — no merge if tests or build fail
3. **Review required** — at least 1 approval before merge
4. **main is always deployable** — if it doesn't build, don't merge
5. **production is stable** — only merge from main, never from feature branches

## GitHub Branch Protection (Setup Once)

Go to: Settings → Branches → Add rule for `main`:
- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
  - [x] `Type Check & Lint`
  - [x] `Unit Tests`
  - [x] `Production Build`
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

Same for `production` branch.

## Test Coverage

Current: **54 tests** across 8 test files:
- `auth.test.ts` — Authentication store (5 tests)
- `hooks.test.ts` — React Query hooks (6 tests)
- `toast.test.ts` — Toast store (3 tests)
- `utils.test.ts` — Utility functions (4 tests)
- `language.test.ts` — Language store (3 tests)
- `backup-store.test.ts` — Backup store + credentials (8 tests)
- `schemas.test.ts` — Zod validation schemas (14 tests)
- `date-utils.test.ts` — Date formatting utilities (11 tests)

Run locally: `npm test`
