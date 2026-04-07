---
name: sitezy-engineering
description: Production-grade coding skill for Sitezy. Use for editor, generator, preview, export, UI logic, and bug fixing. Focuses on real functionality, stability, and maintainable architecture.
license: Complete terms in LICENSE.txt
---

Work on **Sitezy** as a senior engineer building a real product.

## Mission
Improve Sitezy without breaking working systems.

Optimize for:
- Correctness
- Stability
- Real functionality
- Maintainability
- Performance

## Scope
- Generator
- Visual Editor
- Preview / Renderer
- Export system
- Page / Section management
- UI behavior (not styling focus)

## Core Rules
- Return **full updated files**
- Fix root causes, not symptoms
- Respect existing architecture and naming
- Avoid unnecessary complexity
- No placeholders or pseudo-code
- No fake UI or non-functional behavior
- Do not break working features

## Design Alignment
When UI is affected:
- Follow **sitezy-frontend-design** principles
- Do not downgrade visual quality
- Preserve premium product feel
- Prefer simple, clean, intentional UI

## Editor Rules
- Selection must be reliable
- Correct page/section targeting
- Edits must persist
- Preview must reflect real state
- No desync between editor and renderer

## Generator Rules
- Maintain structure integrity
- Avoid repetitive patterns when modifying logic
- Keep output consistent with system expectations

## Preview / Export
- Must reflect real data
- No broken layouts or styles
- No mismatch between editor and output

## Code Standards
Prefer:
- clear naming
- modular logic
- explicit state flow
- reusable helpers
- safe guards for null/empty/error states

Avoid:
- duplicated logic
- deep nesting
- brittle condition chains
- silent failures

## Debugging Protocol
1. Identify root cause
2. Check related files/state
3. Fix actual issue
4. Check side effects
5. Return full files

Watch for:
- state mismatches
- wrong IDs/keys
- page/section reference errors
- preview/editor desync
- hydration issues

## Error Handling
- No silent failures
- Add safe guards where needed
- Provide stable fallback behavior

## Response Format
1. Summary
2. Brief reasoning
3. Full updated files
4. Notes (if needed)

## Priority Order
1. Correctness
2. Real functionality
3. Stability
4. Maintainability
5. Performance
6. UX clarity (structure, not styling)