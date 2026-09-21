---
name: commit-template
description: >
  Create concise git commit messages from staged changes using a fixed template:
  What changed?, Why is this change required/done?, What problem/feature?, Impact —
  each as short bullets only. No staged-files listing. No verbosity. Use when the
  user runs /commit-template, or asks for a commit message, commit template,
  structured commit, or staged-diff commit summary.
---

# Commit Template

Write a short, structured commit message from **staged** changes only.
No fluff. No essays. Bullets only under each heading.

## When this skill runs

- User runs `/commit-template`
- User wants a commit message / structured commit / template-style commit

## Hard rules

1. **Source of truth:** `git diff --cached` (and staged status). Ignore unstaged/untracked unless the user asks to stage first.
2. **No staged-files section** in the message. Readers can run `git status` / `git show --stat` themselves.
3. **No verbosity.** One short line per bullet. Prefer 1–3 bullets per section. Cut adjectives and repetition.
4. **Articulate and simple.** Plain language. No jargon unless the code requires it.
5. **Do not commit** unless the user explicitly asks to commit. Default: output the message (and draft only).
6. If nothing is staged, stop and say so — do not invent a message from unstaged work.

## Steps

1. Run:
   ```bash
   git status
   git diff --cached
   git log -5 --oneline
   ```
2. Infer the intent from the staged diff only.
3. Produce the message in the exact format below.
4. If the user also asked to commit: stage only if they requested; then commit with that message via HEREDOC. Never push unless asked.

## Message format (exact)

```text
<summary>

What changed?
- <bullet>

Why is this change required/done?
- <bullet>

What was the problem solved / feature developed?
- <bullet>

Impact
- <bullet>
```

### Section guide (keep short)

| Section | Answer in bullets |
|---------|-------------------|
| **Summary** | One line, imperative or factual (≤ ~72 chars). Match repo style if recent commits are clear. |
| **What changed?** | Concrete code/UI/behavior deltas. Not “updated files”. |
| **Why is this change required/done?** | Motivation or requirement. Why now. |
| **What was the problem solved / feature developed?** | Problem fixed **or** feature added. One focus. |
| **Impact** | User-visible or system effect. Risk only if real. |

### Bad vs good

**Bad (verbose):**
```text
What changed?
- We carefully refactored several components in order to improve the overall user experience
```

**Good:**
```text
What changed?
- Replaced Bootstrap alert with themed error card on interview load
```

## If asked to commit

```bash
git commit -m "$(cat <<'EOF'
<summary>

What changed?
- ...

Why is this change required/done?
- ...

What was the problem solved / feature developed?
- ...

Impact
- ...
EOF
)"
```

Then show `git status` (short).

## Output to user

- The full commit message in a fenced block (ready to copy), **or**
- Confirm commit created + short status if they asked to commit
