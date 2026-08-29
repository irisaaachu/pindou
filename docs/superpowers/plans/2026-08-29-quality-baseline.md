# Pindou Quality Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repeatable unit-test, lint, type-check and WeChat Mini Program build quality gates without changing product behavior.

**Architecture:** Vitest provides the TypeScript unit-test runner and ESLint checks Vue and TypeScript source. `package.json` exposes one command per gate plus a deterministic aggregate `check` command; the existing uni-app build remains the authoritative WeChat compilation gate.

**Tech Stack:** uni-app Vue 3, TypeScript 4.9, Node type definitions 18.19, Vite 5, Vitest 1.6, ESLint 8, eslint-plugin-vue 9, typescript-eslint 6.

**Spec:** `docs/superpowers/specs/2026-08-29-pindou-mvp-design.md`

## Global Constraints

- Target the WeChat Mini Program first.
- Do not change visible application behavior in this milestone.
- Do not upload original user photos; this milestone adds no photo behavior.
- Use independent code and dependencies; do not copy reference-project code or configuration.
- Keep the minimum tooling required for test, lint, type-check and build verification.

---

### Task 1: Install the test and lint baseline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `.eslintrc.cjs`
- Create: `.eslintignore`
- Create: `vitest.config.mts`

**Interfaces:**
- Consumes: existing `type-check` and `build:mp-weixin` npm scripts.
- Produces: `npm test`, `npm run lint` and `npm run check` quality-gate commands.

- [x] **Step 1: Record the failing baseline**

Run:

```powershell
npm test
npm run lint
```

Expected: both commands fail because the scripts do not exist.

- [x] **Step 2: Install compatible development dependencies**

Run:

```powershell
npm install --save-dev --save-exact vitest@1.6.1 eslint@8.57.1 eslint-plugin-vue@9.28.0 vue-eslint-parser@9.4.3 @typescript-eslint/parser@6.21.0 @typescript-eslint/eslint-plugin@6.21.0 @types/node@18.19.34
```

Expected: `package.json` and `package-lock.json` contain the pinned direct development dependencies. The Node type definitions remain compatible with the project's TypeScript 4.9 compiler.

- [x] **Step 3: Add quality scripts**

Add these exact scripts to `package.json`:

```json
"test": "vitest run --config vitest.config.mts",
"lint": "eslint . --ext .ts,.vue",
"check": "npm run test && npm run lint && npm run type-check && npm run build:mp-weixin"
```

- [x] **Step 4: Add minimal ESLint configuration**

Create `.eslintrc.cjs`:

```javascript
module.exports = {
  root: true,
  env: { es2021: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:vue/vue3-essential",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "vue/multi-word-component-names": "off",
  },
  ignorePatterns: ["dist/", "node_modules/", ".setup-cache/", ".superpowers/"],
};
```

Create `.eslintignore`:

```text
dist/
node_modules/
.setup-cache/
.superpowers/
```

Create `vitest.config.mts` so unit tests do not load the uni-app production Vite plugins and Vite loads the configuration as ESM:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

### Task 2: Prove the test runner and aggregate gate

**Files:**
- Create: `tests/smoke/quality-baseline.test.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: root `package.json` scripts.
- Produces: a smoke test that fails if a required quality command is removed or renamed.

- [x] **Step 1: Write the smoke test**

Create `tests/smoke/quality-baseline.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("quality baseline", () => {
  it("exposes every required verification command", () => {
    expect(packageJson.scripts).toMatchObject({
      test: "vitest run --config vitest.config.mts",
      lint: "eslint . --ext .ts,.vue",
      "type-check": "vue-tsc --noEmit",
      "build:mp-weixin": "uni build -p mp-weixin",
    });
  });
});
```

- [x] **Step 2: Include tests in TypeScript configuration**

Set `resolveJsonModule` to `true`, add `vitest/globals` to compiler types, and include `tests/**/*.ts` in `tsconfig.json`.

- [x] **Step 3: Verify each gate independently**

Run:

```powershell
npm test
npm run lint
npm run type-check
npm run build:mp-weixin
```

Expected: every command exits with code 0; Vitest reports one passing test.

- [x] **Step 4: Verify the aggregate gate**

Run:

```powershell
npm run check
```

Expected: test, lint, type-check and WeChat build all exit with code 0 in sequence.

- [x] **Step 5: Commit and tag the milestone**

```powershell
git add package.json package-lock.json tsconfig.json vitest.config.mts .eslintrc.cjs .eslintignore tests/smoke/quality-baseline.test.ts docs/superpowers/plans/2026-08-29-quality-baseline.md
git commit -m "chore: establish milestone 1 quality baseline"
git tag -a milestone-01-quality-baseline -m "Milestone 1: establish engineering quality baseline"
git push origin main
git push origin milestone-01-quality-baseline
```
