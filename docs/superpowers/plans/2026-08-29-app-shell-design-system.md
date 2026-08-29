# Pindou App Shell and Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Hello World screen with a responsive three-tab Pindou application shell and the approved Fashion Candy visual foundation.

**Architecture:** `pages.json` owns platform navigation, `App.vue` owns cross-platform global visual primitives, and each page owns only its local presentation. All three pages use standard uni-app components and contain no WeChat-only APIs so the same shell can compile for H5 and future App targets.

**Tech Stack:** uni-app Vue 3, TypeScript, standard uni-app components, responsive CSS.

**Spec:** `docs/superpowers/specs/2026-08-29-pindou-mvp-design.md`

## Global Constraints

- Target the WeChat Mini Program first and verify H5 compilation for shared UI.
- Use the approved warm beige, blush pink, mist lavender, pale mint and white visual direction.
- Do not implement photo generation, gallery loading, DIY composition, authorization or cloud data in this milestone.
- Do not add a UI framework or platform-specific component dependency.
- Keep page controls honest: future entry points are presented as content cards, not working actions.

---

### Task 1: Specify the navigation contract

**Files:**
- Create: `tests/smoke/app-shell.test.ts`
- Modify: `src/pages.json`
- Create: `src/pages/create/index.vue`
- Create: `src/pages/my/index.vue`

**Interfaces:**
- Consumes: uni-app `pages.json` page and tab-bar contract.
- Produces: routes `pages/index/index`, `pages/create/index`, and `pages/my/index` with matching tab-bar entries.

- [x] **Step 1: Write the failing navigation test**

The test reads JSON-with-comments safely, asserts all three routes and tab entries, and asserts the page files exist.

- [x] **Step 2: Run the focused test and verify RED**

Run `npm test -- tests/smoke/app-shell.test.ts`.

Expected: failure because Create, My and the tab bar do not exist.

- [x] **Step 3: Add the three-page route and tab configuration**

Set page titles to `拼豆`, `创作`, and `我的`. Use a warm beige global background, dark warm text, mist-lavender selected tab color and muted neutral inactive color.

- [x] **Step 4: Create minimal Create and My page files**

Create valid uni-app Vue pages so every configured route compiles.

### Task 2: Implement the Fashion Candy shell

**Files:**
- Modify: `src/App.vue`
- Modify: `src/pages/index/index.vue`
- Modify: `src/pages/create/index.vue`
- Modify: `src/pages/my/index.vue`

**Interfaces:**
- Consumes: global visual classes from `App.vue`.
- Produces: responsive Home, Create and My shell states without active business actions.

- [x] **Step 1: Add global visual primitives**

Add warm beige page background, readable typography, shared page width, card surfaces, headings, badges and safe-area spacing. Keep colors centralized as CSS custom properties on `page` and the H5 root.

- [x] **Step 2: Build the Home shell**

Show the Pindou identity, a soft hero statement, three creation-path cards for Photo Generator, Pattern Gallery and DIY Patterns, and a concise privacy note. Cards show their future purpose without navigating to unfinished pages.

- [x] **Step 3: Build the Create shell**

Show separate Local Drafts and Cloud Projects sections. Explain that cloud access will require WeChat authorization, but do not request authorization yet.

- [x] **Step 4: Build the My shell**

Show a guest profile state, optional avatar/nickname explanation and privacy/about rows without implementing login handlers.

- [x] **Step 5: Verify narrow and wide responsive layout in code**

Use wrapping/grid rules with no fixed viewport width, internal horizontal scrolling or fixed-height page shell.

### Task 3: Verify and publish the milestone

**Files:**
- Modify: `docs/superpowers/plans/2026-08-29-app-shell-design-system.md`

**Interfaces:**
- Consumes: Milestone 1 quality gates.
- Produces: verified WeChat and H5 build evidence and a named Git milestone.

- [x] **Step 1: Run the focused navigation test**

Run `npm test -- tests/smoke/app-shell.test.ts` and expect one passing file.

- [x] **Step 2: Run the complete quality gate**

Run `npm run check` and expect tests, lint, type-check and WeChat build to exit 0.

- [x] **Step 3: Run the H5 build**

Run `npm run build:h5` and expect exit 0.

- [x] **Step 4: Commit, tag and push**

Commit as `feat: build milestone 2 app shell and design system`, tag as `milestone-02-app-shell-design-system`, and push `main` plus the tag.
