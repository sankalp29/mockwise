---
name: pr
description: >
  Open a GitHub pull request from the current feature branch into dev, with a
  simple articulate description covering What, Why, How, and Impact. Use when
  the user runs /pr, or asks to create a PR, open a pull request, cut a PR,
  or merge a feature branch into dev.
---

# /pr — Pull request into `dev`

Create (or reuse) a PR that merges the **current work** into **`dev`**, with a
clear description in plain language.

## When this skill runs

- User runs `/pr`
- User asks to create / open / cut a PR (default base: **`dev`**)

## Defaults (this repo)

| Setting | Value |
|---------|--------|
| Base branch | `dev` |
| Head | current feature branch |
| Remote | `origin` |
| Draft | no (unless user asks) |

If the user names another base (`master`, `main`, etc.), honor that override.

## Hard rules

1. **Never force-push.** Never amend published history unless the user explicitly asks.
2. **Never push** without confirming if the branch is new or the remote diverged unexpectedly — except when `/pr` implies push is required to open the PR (then push with normal `git push -u origin HEAD`).
3. **Do not invent commits.** If there is nothing to PR (no commits ahead of base, or no changes), stop and explain.
4. **Do not create a PR** if an open PR already exists for the same head → base; show its URL instead (optionally offer to update the body).
5. **Description language:** simple, articulate, complete sentences. No dump of file lists. No raw commit spam as the whole body.
6. **Base is `dev`** unless the user says otherwise.

## Steps

### 1. Inspect git state

Run in parallel:

```bash
git status -sb
git branch -vv
git rev-parse --abbrev-ref HEAD
git fetch origin
git remote -v
```

Identify:

- Current branch name
- Whether working tree is clean (uncommitted changes)
- Whether `origin/dev` exists (fetch first)

### 2. Ensure we are on a feature branch

**Allowed feature branch patterns** (examples): `feature/*`, `fix/*`, `chore/*`, `docs/*`, `p0/*`, `p1/*`, etc. — anything that is **not** `dev`, `master`, or `main`.

| Situation | Action |
|-----------|--------|
| Already on a feature branch | Continue |
| On `dev` / `master` / `main` with **committed** work that is not on base, or with **uncommitted** work the user wants in a PR | Create and switch to a new branch. Name it from the change (`feature/<short-kebab-summary>`). Ask the user for the name only if the intent is ambiguous. |
| On `dev` / `master` / `main` with a clean tree and nothing ahead of `origin/dev` | Stop: nothing to PR |

If creating a branch from dirty work on `dev`:

```bash
git checkout -b feature/<short-name>
```

If there are **uncommitted** changes the user clearly wants in the PR:

- Stage and commit only with an explicit user request to commit, **or**
- If `/pr` was requested and changes are clearly the PR subject, propose a short commit message and ask before committing (do not commit silently).

### 3. Confirm commits exist vs base

```bash
git log origin/dev..HEAD --oneline
git diff origin/dev...HEAD --stat
```

If empty after fetch: stop — branch is not ahead of `dev` (already merged or no commits).

Also check for an existing PR:

```bash
gh pr list --head "$(git rev-parse --abbrev-ref HEAD)" --base dev --state open
```

If one is open: print the URL and stop (unless user asked to update the description).

### 4. Push the branch

```bash
git push -u origin HEAD
```

If push fails (auth, non-fast-forward), diagnose and ask the user — do not force-push.

### 5. Write the PR description (What / Why / How / Impact)

Infer from:

```bash
git log origin/dev..HEAD --format='%h %s%n%b'
git diff origin/dev...HEAD
```

Use recent commit style for the **title** (short, imperative or `feat:` / `fix:` if the repo uses that).

**Title:** one line, ≤ ~72 chars, summarizes the change for reviewers.

**Body** — exact section structure (markdown):

```markdown
## What
<2–4 sentences or short bullets. What shipped in this PR — user-visible behavior and main technical pieces. Plain language.>

## Why
<1–3 sentences or short bullets. Motivation: problem, product goal, or requirement.>

## How
<2–5 short bullets. Approach at a design level — key modules, patterns, tradeoffs. Not a file laundry list.>

## Impact
<1–3 bullets. Who/what is affected, risk, rollout notes, free vs paid, auth, perf, etc.>

## Test plan
- [ ] <concrete check>
- [ ] <concrete check>
```

### Section guide

| Section | Answer |
|---------|--------|
| **What** | Concrete product/behavior delta. “Adds free HLD session with Excalidraw” not “updated several files”. |
| **Why** | Why this exists now. User pain, roadmap, bug, enablement. |
| **How** | Mechanism: routes, components, libs, data locality, timer model, etc. |
| **Impact** | Users, auth surface, bundle size, backward compatibility, ops. |
| **Test plan** | Steps a reviewer can actually run. |

Keep tone **simple and articulate**. Prefer short paragraphs + bullets over walls of text.

### 6. Open the PR

```bash
gh pr create --base dev --head "$(git rev-parse --abbrev-ref HEAD)" --title "<title>" --body "$(cat <<'EOF'
## What
...

## Why
...

## How
...

## Impact
...

## Test plan
- [ ] ...
EOF
)"
```

If `gh` is unavailable, print the compare URL and the full body for manual creation:

`https://github.com/<owner>/<repo>/compare/dev...<branch>`

### 7. Report back

Show the user:

1. PR URL
2. Base ← head (`dev` ← `feature/...`)
3. Short confirmation that the body uses What / Why / How / Impact

## Edge cases

| Case | Behavior |
|------|----------|
| Open PR already exists for this branch → `dev` | Link it; do not open a duplicate |
| Branch already fully merged into `dev` | Say so; link the merged PR if findable via `gh pr list --head <branch> --state merged` |
| Unrelated uncommitted junk | Do not include; warn the user |
| User asks for draft PR | `gh pr create --draft ...` |
| User asks for master/main as base | Use that base; still use the same description template |
| Multiple logical features on one branch | Still one PR; describe the full delta honestly, or suggest splitting if clearly huge |

## Anti-patterns

- File-path laundry lists as the whole description
- Pasting every commit message with no synthesis
- PR into `master` by default (this repo uses **`dev`**)
- Creating a PR with zero commits ahead of base
- Force-push to “make the PR work”

## Output to user

- PR URL (primary)
- Title + reminder of base branch
- If blocked: exact reason and the next command/fix needed
