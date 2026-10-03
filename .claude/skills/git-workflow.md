---
name: git-workflow
description: "Professional Git & GitHub workflow skill. Trigger when reviewing, grouping, committing, or pushing code changes to a repository."
license: Apache-2.0
metadata:
  version: "1.0"
---

## When to Use

Load this skill when asked to:
- Review uncommitted or modified files (`git status` / `git diff`).
- Group changes into clean, atomic commits.
- Format commit messages using Conventional Commits.
- Prepare and push changes safely to a remote repository.
- Create Pull Requests or feature branches.

---

## Core Rules & Philosophy

1. **Atomic Commits:** Each commit must represent **one single logical change**. Never mix refactoring, feature code, and documentation updates in the same commit.
2. **Never push directly to `main`/`master`** unless explicitly instructed for small/personal repositories.
3. **Clean Staging:** Never run `git add .` blindly if there are untracked temp files, secret `.env` files, or unrelated modifications.
4. **Imperative Mood:** Write subject lines as commands (e.g., `add feature`, NOT `added feature` or `adding feature`).
5. **Language Rule:** Use English by default for commit types/titles unless the project repository specifically uses Spanish commit messages.

---

## 1. Commits Classification (Conventional Commits)

Format: `<type>(<optional-scope>): <short description in imperative mood>`

| Type | When to use | Example |
|------|-------------|---------|
| `feat` | New functionality or user feature | `feat(auth): add JWT login refresh endpoint` |
| `fix` | Bug fix or issue resolution | `fix(ui): resolve navbar overflow on mobile screens` |
| `docs` | Documentation changes (README, inline docs, guides) | `docs: update setup instructions in README` |
| `refactor` | Code rewrite without feature/bug behavior changes | `refactor(db): extract query helper into repository file` |
| `style` | Formatting, missing semicolons, linter fixes | `style: apply prettier formatting to auth modules` |
| `test` | Adding or updating unit/integration tests | `test(api): add unit tests for user creation` |
| `chore` | Build tasks, package updates, config changes | `chore(deps): bump express to v4.19.2` |
| `perf` | Performance optimization changes | `perf(images): compress hero assets to webp` |

> **Breaking Changes:** Append an exclamation mark `!` after type/scope, e.g.: `feat(api)!: drop legacy v1 endpoints`.

---

## 2. Step-by-step Workflow Execution

When instructed to push or commit changes, follow these strict execution steps:

### Step 1: Inspection & Safety Check
Execute and inspect status:
```bash
git status
git diff --stat