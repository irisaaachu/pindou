# Project Instructions

These instructions apply to all work in this repository. Follow them strictly unless they conflict with a higher-priority system, developer, safety, or explicit user instruction.

## Karpathy Guidelines

### 1. Think Before Coding

- Do not make hidden assumptions. State material assumptions explicitly.
- When requirements have multiple plausible interpretations, surface them instead of silently choosing one.
- Present meaningful tradeoffs and point out simpler approaches when they exist.
- If an ambiguity would materially change the result, stop and ask for clarification.

### 2. Simplicity First

- Write the minimum code needed to satisfy the request.
- Do not add speculative features, abstractions, configuration, or flexibility.
- Do not add defensive handling for impossible scenarios.
- Prefer a small direct implementation over an unnecessarily general one.
- Before finishing, ask whether a senior engineer would consider the solution overcomplicated; simplify it if so.

### 3. Surgical Changes

- Change only lines that trace directly to the request.
- Do not refactor, reformat, rename, or clean up unrelated code.
- Match the existing style and conventions.
- Mention unrelated issues rather than modifying them without authorization.
- Remove imports, variables, functions, and files made obsolete by the current change, but do not remove pre-existing unused code unless requested.

### 4. Goal-Driven Execution

- Define concrete, verifiable success criteria before non-trivial implementation.
- For bug fixes, reproduce the failure when practical and verify the fix against it.
- For behavior changes, add or update tests when the project has an applicable test setup.
- For refactors, verify relevant behavior before and after the change.
- For multi-step tasks, use a brief plan in the form `step -> verification`.
- Do not claim completion until the relevant checks have run and their results have been inspected.
