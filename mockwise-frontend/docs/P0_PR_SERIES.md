# P0 PR series — production hygiene

Implement in order. Each PR should stay reviewable on its own.

## PR 1 — `p0/01-env-secrets`

**REQ:** P0-01, P0-02

**Files**

- `.gitignore` — ignore `.env`, `.env.*`, keep `!.env.example`
- `.env.example` — placeholders only
- `git rm --cached .env` if tracked (local `.env` stays)

**Verify**

```bash
git check-ignore -v .env
# should match ignore rule
test -f .env.example && ! grep -E 'railway|eyJ|auth\.mockwise' .env.example
```

---

## PR 2 — `p0/02-auth-logger`

**REQ:** P0-03, P0-04

**Files**

- `src/utils/logger.js`
- `src/utils/authBypassLogic.js`
- `src/utils/authBypass.js`
- `src/utils/authBypass.resolve.test.mjs`
- Logger migration across `src/**` (no raw `console.*` left in app code)

**Verify**

```bash
node src/utils/authBypass.resolve.test.mjs
# production build must not enable bypass
VITE_BYPASS_AUTH=true npm run build
# AUTH_BYPASS is compile-time false when PROD
rg "console\\.(log|error|warn)" src && echo "FAIL: raw console left" || echo "OK"
```

---

## PR 3 — `p0/03-bootstrap-assets-readme`

**REQ:** P0-05, P0-06, P0-07, P0-08 (+ ErrorBoundary Vite env fix)

**Files**

- `index.html` — no Bootstrap CDN; preconnect fonts
- `src/main.jsx` — single Bootstrap CSS import
- `src/App.jsx` — Bootstrap CSS import removed
- `package.json` — name `mockwise-frontend`, version `0.1.0`
- `README.md` — product docs
- `scripts/p0-cleanup-assets.sh` then run it
- `src/components/ErrorBoundary.jsx` — `import.meta.env.DEV`, neutral copy

**Verify**

```bash
bash scripts/p0-cleanup-assets.sh
test ! -d public/company-logos/MockWise_files
grep -c bootstrapcdn index.html || true  # expect 0 matches
grep -E '"name"|"version"' package.json
npm run build
```

---

## One-shot local apply (if not using three branches)

```bash
cd /Users/sankalpbhagwat/Desktop/MockWise/mockwise-frontend
bash scripts/p0-cleanup-assets.sh
git checkout -b p0/production-hygiene
git add -A
# Prefer 3 commits matching the PRs above, then:
# git push -u origin HEAD && gh pr create
```

## Workspace note

Agent shells fail if CWD is the missing path `MockWise-FE`. Use:

```bash
ln -sfn /Users/sankalpbhagwat/Desktop/MockWise/mockwise-frontend \
        /Users/sankalpbhagwat/Desktop/MockWise/MockWise-FE
```

or open the `mockwise-frontend` folder as the workspace.
