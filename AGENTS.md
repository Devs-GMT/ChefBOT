# ChefBOT — OpenCode Instructions

## Project Context

ChefBOT is an AI-powered cooking application.
Read the project PRD before making changes.
Visual reference: https://realfood.gov/

## Agent Skills

Use the installed Agent Skills whenever applicable.
Read the corresponding SKILL.md before starting a task.
Do not skip required specification, planning, testing,
security, or review steps.

## Workflow

1. Inspect the repository and working tree.
2. Read the PRD and relevant documentation.
3. Use spec-driven-development for new features.
4. Use planning-and-task-breakdown to create small tasks.
5. Use incremental-implementation and
   test-driven-development during implementation.
6. Use frontend-ui-engineering for interface work.
7. Use security-and-hardening for APIs and contracts.
8. Use debugging-and-error-recovery when failures occur.
9. Use code-review-and-quality before release.

## ChefBOT Requirements

- Follow the ChefBOT MVP PRD.
- Preserve existing working code.
- Build incrementally and verify each milestone.
- Keep AI credentials server-side.
- Validate recipe data and smart contract behavior.
- Use BOT Chain Mainnet chain ID 677 only after
  verifying the network configuration.
- Never deploy to mainnet without explicit approval.
- Never fabricate successful tests or deployments.

## Completion Criteria

Report changed files, implemented features, tests run,
actual test results, outstanding blockers, and next steps.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
