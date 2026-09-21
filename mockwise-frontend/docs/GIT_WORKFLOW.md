# Git workflow

## Branches

| Branch | Role |
|--------|------|
| **master** | Production. What is deployed (or ready to deploy). |
| **dev** | Integration branch. Cut from `origin/master`. Day-to-day merges land here first. |
| **feature/**\*\* or **p0/**\*\* | Feature / fix work. Always cut **from `dev`**. |

## Pull requests

1. **feature → dev** — open a PR when work is ready for integration.
2. **dev → master** — periodically (release / promote), open a PR to ship integrated work to production.

Prefer small PRs. Keep `dev` green before promoting to `master`.

## Start new work

```bash
git fetch
git checkout dev
git pull
git checkout -b feature/name
# or: git checkout -b p0/name
```

Push and open a PR against `dev`:

```bash
git push -u origin HEAD
```

## Notes

- Do not commit directly to `master` for product work; use the PR path above.
- If you must hot-fix production, still prefer a short-lived branch + PR into `master`, then back-merge `master` → `dev` so `dev` stays current.
