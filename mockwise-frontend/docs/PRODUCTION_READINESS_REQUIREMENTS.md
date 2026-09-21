# MockWise Frontend — Production Readiness Plan & Requirements

**Repo:** `mockwise-frontend`  
**Audience:** Implementers (human or agent)  
**Rule:** Requirements are binary. Done = all acceptance criteria pass.

---

## Priority plan (execution order)

| Phase | Name | Goal | Depends on |
|-------|------|------|------------|
| **P0** | Safety & hygiene | Ship without leaking secrets or shipping debug backdoors | — |
| **P1** | Quality gates | Every PR is linted and builds | P0 |
| **P2** | Runtime resilience | Failures are contained and user-safe | P0 |
| **P3** | Load performance | Home is not paying for IDE/dashboard code | P1 |
| **P4** | API & data layer | One HTTP path, consistent auth/errors | P0 |
| **P5** | Test foundation | Critical paths have automated checks | P1, P4 |
| **P6** | Structure & maintainability | Clear layout, less dependency chaos | P3–P5 (can overlap) |
| **P7** | Observability & polish | Know when prod breaks; a11y/docs | P2, P5 |

Do not start P6 large refactors before P0–P2. Security and CI first.

---

# P0 — Safety & hygiene

## REQ-P0-01 — Ignore environment secrets in git

**What to build**

1. Update `.gitignore` to include at minimum:
   ```
   .env
   .env.*
   !.env.example
   ```
2. Confirm `.env.example` remains trackable via the negation pattern.
3. If `.env` is currently tracked, stop tracking it (`git rm --cached .env`) without deleting the local file.

**Acceptance criteria**

- [x] `git check-ignore -v .env` reports an ignore rule. *(rule in `.gitignore`; run check-ignore after clone)*
- [x] `.env.example` is not ignored. *(`!.env.example`)*
- [x] Fresh clone cannot contain a committed real `.env` from this change set. *(ignore + do not re-add `.env`)*

---

## REQ-P0-02 — Sanitize `.env.example`

**What to build**

Replace real values in `.env.example` with placeholders only:

```env
# Copy to .env and fill in real values. Never commit .env.

VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API (no trailing slash)
VITE_API_BASE_URL=http://localhost:8080

# Local testing only — must stay false/unset in production deploys
# VITE_BYPASS_AUTH=false
```

**Acceptance criteria**

- [x] No production Supabase URL, JWT-like anon key, or production Railway URL remains in `.env.example`.
- [x] README (REQ-P0-06) documents each variable in one sentence.

---

## REQ-P0-03 — Hard-block auth bypass in production builds

**What to build**

In `src/utils/authBypass.js` (or equivalent single source of truth):

1. `AUTH_BYPASS` is `true` only when **both**:
   - `import.meta.env.VITE_BYPASS_AUTH === 'true'` (case-insensitive), and
   - `import.meta.env.PROD !== true` (i.e. not a production Vite build).
2. If `VITE_BYPASS_AUTH=true` while `import.meta.env.PROD === true`, set bypass off and `console.error` once at module load with a clear message that bypass is disabled in production.

**Acceptance criteria**

- [x] `vite build` with `VITE_BYPASS_AUTH=true` in env still results in `AUTH_BYPASS === false` at runtime in the built bundle (verify by temporary assert or unit test). *(`resolveAuthBypass` + `authBypass.resolve.test.mjs`)*
- [x] `vite` dev with `VITE_BYPASS_AUTH=true` still enables bypass.
- [x] Protected routes cannot be opened anonymously in a production build solely via this flag.

---

## REQ-P0-04 — Gate debug logging

**What to build**

1. Add `src/utils/logger.js`:
   - `log`, `warn`, `error`, `debug` helpers.
   - `log` / `debug` no-op when `import.meta.env.PROD === true`.
   - `warn` / `error` always call `console.warn` / `console.error`.
2. Replace emoji/debug `console.log` in at least:
   - `src/interview/InterviewLoader.jsx`
   - `src/dashboard/KeyMetrics.jsx`
   - `src/dashboard/InterviewHistory.jsx`
   - `src/SupabaseAuthContext.jsx` (auth state “changed” info logs → `debug` only)
3. Leave true error reporting on `logger.error` / `console.error` for failures.

**Acceptance criteria**

- [x] Production build: no debug `console.log` from InterviewLoader mount/initialize paths. *(logger.log no-ops when PROD; no raw console in src)*
- [x] Dev: debug logs still available via `logger.debug` / `logger.log`.
- [x] Failed API/auth paths still surface via `error`.

---

## REQ-P0-05 — Single Bootstrap CSS source; drop unused Bootstrap JS

**What to build**

1. In `index.html`, remove:
   - CDN Bootstrap CSS `<link>`
   - CDN Bootstrap JS `<script>`
2. Keep npm Bootstrap CSS import exactly once (currently `main.jsx` and/or `App.jsx` — reduce to **one** import site, preferably `main.jsx` only).
3. Do not reintroduce Bootstrap’s bundle JS unless a specific feature requires it; react-bootstrap does not need it for current modals/navbar usage.

**Acceptance criteria**

- [x] `index.html` has zero Bootstrap CDN tags.
- [x] Network tab on cold load: only one Bootstrap CSS payload from the app bundle (or CSS chunk), not CDN + bundle. *(single import in main.jsx)*
- [ ] Login modal, navbar collapse, dropdowns still work on desktop and mobile viewport. *(manual smoke after merge)*

---

## REQ-P0-06 — Product README

**What to build**

Replace scaffold README with MockWise frontend docs containing:

1. **What this is** (1 paragraph).
2. **Prerequisites** (Node version: state LTS, e.g. 20+).
3. **Setup**
   - `npm install`
   - `cp .env.example .env` + which vars to fill
4. **Scripts** table: `dev`, `build`, `preview`, `lint` (and later `test` when added).
5. **Environment variables** table: name, required?, description.
6. **Auth bypass** warning: local only; blocked in production builds (link REQ-P0-03).
7. **Deploy notes**: SPA fallback (`public/_redirects`), that `VITE_*` must be set at **build** time.

**Acceptance criteria**

- [x] New engineer can run the app locally from README alone.
- [x] No Create-Vite boilerplate remains as the primary content.

---

## REQ-P0-07 — Remove junk public assets

**What to build**

1. Delete `public/company-logos/MockWise_files/` entirely (saved webpage dump).
2. Inventory `public/company-logos/*.png` that are unused when app only references `resized/`; delete unused full-size logos **only after** confirming no `src` references via search.
3. Do not delete assets still referenced under `/coding-interview-steps-logos/`, `/IDE.png`, `/Feedback.png`, `/mockwise.png`, or `resized/`.

**Acceptance criteria**

- [ ] `MockWise_files` directory gone. *→ run `bash scripts/p0-cleanup-assets.sh`*
- [ ] `grep -r "MockWise_files" src public` returns nothing relevant. *→ after script*
- [ ] Home company logos and platform preview still render. *→ after script; only resized/ referenced*

---

## REQ-P0-08 — Package identity

**What to build**

In `package.json`:

- `"name": "mockwise-frontend"` (or `@mockwise/frontend`)
- `"version": "0.1.0"` (or current real version if you version elsewhere)
- Optional: `"private": true` kept

**Acceptance criteria**

- [x] Package name is not `uilayer`. *(`mockwise-frontend`)*
- [x] Version is not `0.0.0`. *(`0.1.0`)*

---

# P1 — Quality gates

## REQ-P1-01 — CI pipeline (GitHub Actions)

**What to build**

File: `.github/workflows/ci.yml`

On `pull_request` and `push` to `main`/`master`:

1. Checkout
2. Setup Node 20
3. `npm ci`
4. `npm run lint`
5. `npm run build` with dummy env:
   ```yaml
   env:
     VITE_SUPABASE_URL: https://example.supabase.co
     VITE_SUPABASE_ANON_KEY: example-anon-key
     VITE_API_BASE_URL: https://api.example.com
     VITE_BYPASS_AUTH: "false"
   ```

**Acceptance criteria**

- [ ] Workflow file exists and is valid YAML.
- [ ] Lint or build failure fails the job.
- [ ] Build succeeds with placeholder env (app may not run against real APIs).

---

## REQ-P1-02 — npm scripts for CI parity

**What to build**

Ensure `package.json` scripts:

```json
"lint": "eslint .",
"build": "vite build",
"preview": "vite preview"
```

Optional but recommended:

```json
"typecheck": "echo \"No TS yet\"" 
```

(Only add real typecheck when TypeScript lands.)

**Acceptance criteria**

- [ ] CI invokes the same scripts developers run locally.

---

## REQ-P1-03 — ESLint fails on unused imports (tighten)

**What to build**

Extend ESLint config so unused vars/imports fail CI for `src/**/*.{js,jsx}` (keep existing hooks rules).  
Do not enable rules that require a multi-day cleanup without fixing violations in the same PR.

**Acceptance criteria**

- [ ] `npm run lint` exits 0 on main after the PR that enables/fixes rules.
- [ ] New unused imports fail lint.

---

# P2 — Runtime resilience

## REQ-P2-01 — Root error boundary

**What to build**

1. Wrap the tree in `main.jsx` or `App.jsx` with a root `ErrorBoundary` that catches render errors for the whole app (not only Dashboard).
2. Fallback UI must match dark MockWise theme (reuse dashboard/interview empty-card patterns, not raw Bootstrap danger alert as the only treatment).
3. Actions: “Reload page” (`window.location.reload()`) and “Go home” (`/home` or `/`).
4. Fix env check: use `import.meta.env.DEV` instead of `process.env.NODE_ENV` for showing stack details.

**Acceptance criteria**

- [ ] Throw in a child of Home (temporary test) shows themed fallback, not a white crash.
- [ ] Stack details visible only when `import.meta.env.DEV === true`.
- [ ] Dashboard keeps nested boundaries optional; root still catches outside Dashboard.

---

## REQ-P2-02 — Not-found route

**What to build**

In `RouteHandler.jsx`:

1. Add `<Route path="*" element={<NotFoundPage />} />`.
2. New page component `src/pages/NotFoundPage.jsx` (or `src/NotFoundPage.jsx` if pages folder not created yet):
   - Dark themed
   - Message: page not found
   - Buttons: Home, Practice (if logged in optional — Home always)

**Acceptance criteria**

- [ ] Visiting `/this-does-not-exist` shows NotFound, not a blank router outlet.
- [ ] Home navigation works from NotFound.

---

## REQ-P2-03 — Production-safe ErrorBoundary dashboard copy

**What to build**

Generalize `ErrorBoundary` copy so it is not dashboard-specific (“The dashboard encountered…”). Use neutral: “Something went wrong” + retry.

**Acceptance criteria**

- [ ] Same component usable at app root without misleading dashboard wording.

---

# P3 — Load performance

## REQ-P3-01 — Route-level code splitting

**What to build**

In `RouteHandler.jsx` (or a dedicated `routes.jsx`):

1. Convert these to `React.lazy(() => import(...))`:
   - `InterviewSession`
   - `InterviewLoader`
   - `InterviewFeedback`
   - `DemoFeedback`
   - `FeedbackLoader`
   - `CodeViewer`
   - `Dashboard`
   - `CustomizeYourInterview`
   - `ResetPasswordRoute` (optional)
2. Keep `Home` eager (landing).
3. Wrap `Routes` (or each lazy route) in `<Suspense fallback={<RouteFallback />}>`.
4. `RouteFallback`: full-viewport dark spinner centered (reuse interview loader aesthetic, no Bootstrap alert).

**Acceptance criteria**

- [x] Production build emits separate JS chunks for at least InterviewSession and Dashboard.
- [x] Visiting `/home` does not download the InterviewSession chunk (verify in build output or Network with cache disabled before navigating to session).
- [x] Navigating to `/practice` and `/dashboard` still works with a brief fallback.

---

## REQ-P3-02 — Vite chunk strategy (manualChunks)

**What to build**

In `vite.config.js`, add `build.rollupOptions.output.manualChunks` that at minimum splits:

- `vendor-react`: `react`, `react-dom`, `react-router-dom`
- `vendor-supabase`: `@supabase/supabase-js`
- `vendor-monaco`: `@monaco-editor/react` (and monaco if pulled)

Do not over-split into dozens of tiny chunks.

**Acceptance criteria**

- [x] `npm run build` succeeds.
- [x] Dist contains separate files matching the vendor split (names may be hashed).

---

## REQ-P3-03 — Font loading hygiene

**What to build**

In `index.html`:

1. Add:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   ```
2. Ensure Google Fonts URL includes `display=swap` (already if present).
3. Reduce loaded weights if Fira Code is only used in code views: document which weights are required; load only those (e.g. 400;500;700) instead of full variable 300–700 if unused.

**Acceptance criteria**

- [x] Preconnect tags present.
- [x] No layout-blocking font CSS without `display=swap`.

---

## REQ-P3-04 — Image performance baseline (step icons + logo)

**What to build**

1. For InterviewFlow icons displayed at 140×140 CSS:
   - Provide resized assets max edge **320px**, WebP preferred, PNG fallback if needed.
   - Target: each icon **≤ 40KB** (measure on disk).
2. Header logo displayed at maxHeight 40px:
   - Provide ≤ 128px edge asset, **≤ 15KB**.
3. Update JSX `src` to new paths.
4. Add `width`/`height` (or aspect-ratio CSS) and `decoding="async"` on those `<img>`s.
5. Below-fold platform images (`IDE.png`, `Feedback.png`): `loading="lazy"`.

**Acceptance criteria**

- [x] File sizes meet caps above (measure with `ls -l` / `stat`).
- [x] Visual quality acceptable at 2x DPR on a 140px icon.
- [x] Home still looks correct.

---

# P4 — API & data layer

## REQ-P4-01 — Shared Axios instance

**What to build**

`src/api/http.js` (or `src/lib/http.js`):

1. `axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 30000 })`.
2. Request interceptor: if `getAccessToken` is registered, set `Authorization: Bearer <token>` when token non-null.
3. Provide `setAuthTokenGetter(fn)` called from auth provider on mount.
4. Response interceptor: on 401, optionally dispatch a custom event `auth:unauthorized` (Header/App may open login later — document; minimum: reject with normalized error).
5. Export helpers: `http.get/post/put/delete`.

**Acceptance criteria**

- [ ] New code path can call `http.get('/api/dashboard/metrics')` without manual header assembly.
- [ ] Timeout is 30s by default.
- [ ] 401 rejects with a clear error object `{ status, message, data }`.

---

## REQ-P4-02 — Migrate existing calls to shared client (critical paths)

**What to build**

Migrate these modules to use `http` + `API_ENDPOINTS` (no duplicated base URL string concatenation except via `buildApiUrl` or `http`):

1. `InterviewLoader.jsx` (start + recover)
2. `KeyMetrics.jsx`
3. `InterviewHistory.jsx`
4. `HomeUpperBody.jsx` (ongoing interview)
5. `InterviewSession.jsx` (submit, syntax, stubs — all axios calls)

**Acceptance criteria**

- [ ] No raw `axios.get/post` remain in the five modules above (import from `http` only).
- [ ] Authenticated happy path still works against real backend when logged in.
- [ ] Missing token still surfaces a controlled error UI (not an uncaught exception).

---

## REQ-P4-03 — Normalize API errors

**What to build**

`src/api/errors.js`:

```js
// export function toApiError(error) => { status?: number, message: string, code?: string }
```

Map:

- Network/timeout → message “Network error. Check your connection.”
- 401 → “Please sign in again.”
- 403 → “You do not have access.”
- 404 → “Not found.”
- 4xx/5xx with `response.data.error` string → use that string if safe length &lt; 300 chars
- Else → “Something went wrong.”

Use in InterviewLoader error mapping as the first pass before specialized copy.

**Acceptance criteria**

- [ ] Unit-testable pure function (add tests in P5).
- [ ] InterviewLoader auth failure still shows friendly themed UI.

---

# P5 — Test foundation

## REQ-P5-01 — Vitest + React Testing Library

**What to build**

1. Dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
2. `vitest.config.js` with `environment: 'jsdom'`, React plugin compatible setup.
3. `package.json` script: `"test": "vitest run"`, `"test:watch": "vitest"`.
4. CI job step: `npm test` after lint (update REQ-P1-01 workflow).

**Acceptance criteria**

- [ ] `npm test` runs and exits 0 with at least the tests below.

---

## REQ-P5-02 — Required unit tests (minimum set)

**What to build**

| File | Tests |
|------|--------|
| `src/utils/authBypass.test.js` | bypass false when PROD; true only when flag + non-PROD (mock `import.meta.env` per Vitest patterns) |
| `src/api/errors.test.js` | mappings for 401, 404, network, server message |
| `src/utils/validation.test.js` | email/password helpers already exported |
| `src/components/ErrorBoundary.test.jsx` | child throw → fallback text “Something went wrong” |

**Acceptance criteria**

- [ ] All four files exist and pass.
- [ ] No test relies on real network.

---

## REQ-P5-03 — Router smoke test

**What to build**

One test that renders app routes with memory router + mocked auth context:

- `/home` shows MockWise heading text (or known hero substring).
- Unknown path shows NotFound content (after REQ-P2-02).

**Acceptance criteria**

- [ ] Test does not call real Supabase or backend.

---

# P6 — Structure & maintainability

## REQ-P6-01 — Path aliases

**What to build**

Vite + JSConfig:

```js
// vite.config.js resolve.alias
'@': path.resolve(__dirname, 'src')
```

`jsconfig.json`:

```json
{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] } } }
```

Migrate imports in `RouteHandler.jsx` and `App.jsx` as the pattern sample (full-repo rewrite optional later).

**Acceptance criteria**

- [ ] `@/utils/api` resolves in dev and build for migrated files.

---

## REQ-P6-02 — Feature folder move (no behavior change)

**What to build**

Reorganize without changing runtime behavior:

```text
src/
  app/           # App.jsx, main.jsx, RouteHandler.jsx, providers
  features/
    auth/        # SupabaseAuthContext, login/*, authBypass usage
    home/
    interview/
    dashboard/
    practice/    # CustomizeYourInterview
  shared/
    api/
    components/  # ErrorBoundary, PasswordInput, etc.
    hooks/
    styles/
    utils/
    lib/
```

Use re-export shims **or** update all imports in one PR. Prefer one PR with compile-green build.

**Acceptance criteria**

- [ ] `npm run build` succeeds.
- [ ] No duplicate component definitions left at old paths (or thin re-exports only for one release).

---

## REQ-P6-03 — Dependency declutter (explicit removals)

**What to build**

1. Inventory actual imports under `src/` for:
   - CodeMirror family vs Monaco
   - recharts vs chart.js
   - tsparticles / react-tsparticles
   - react-toastify
   - lucide vs lucide-react vs react-icons vs bootstrap-icons
2. Remove packages with **zero** imports in `src/`.
3. If both Monaco and CodeMirror are imported, document which surface uses which; open follow-up ticket to standardize on one for the IDE only — do not remove Monaco if session depends on it.

**Acceptance criteria**

- [ ] `package.json` no longer lists packages with zero references.
- [ ] `npm run build` succeeds after removal.
- [ ] Written note in PR: list removed packages.

---

## REQ-P6-04 — Prettier

**What to build**

1. Add Prettier + `prettier` script `format` / `format:check`.
2. Add `.prettierrc` (single quotes or match majority of codebase — pick one and apply).
3. CI: `npm run format:check` optional in P1 CI once format is applied in a dedicated PR.

**Acceptance criteria**

- [ ] `format:check` passes on CI after format PR merges.

---

# P7 — Observability & polish

## REQ-P7-01 — Error reporting hook (Sentry or equivalent)

**What to build**

1. Optional `@sentry/react` behind `VITE_SENTRY_DSN`.
2. If DSN missing, no-op.
3. Initialize in `main.jsx` only when DSN set.
4. `ErrorBoundary.componentDidCatch` calls `Sentry.captureException`.
5. Document `VITE_SENTRY_DSN` in README and `.env.example` as optional.

**Acceptance criteria**

- [ ] Without DSN, app behaves as today.
- [ ] With DSN in dev, test error appears in Sentry project (manual verify).

---

## REQ-P7-02 — jsx-a11y lint plugin

**What to build**

Add `eslint-plugin-jsx-a11y` recommended rules; fix **errors** introduced on touched files or globally if volume is small.  
Do not ignore the plugin wholesale.

**Acceptance criteria**

- [ ] Plugin enabled in `eslint.config.js`.
- [ ] `npm run lint` passes.

---

## REQ-P7-03 — Meta & PWA basics (light)

**What to build**

In `index.html`:

1. `<meta name="description" content="...">` one sentence about MockWise.
2. Correct favicon type if using PNG (`type="image/png"`).
3. Optional Open Graph title/description (static).

**Acceptance criteria**

- [ ] View-source shows description meta.
- [ ] Favicon loads.

---

# Requirement traceability (audit → REQ)

| Audit gap | Requirements |
|-----------|----------------|
| `.env` not ignored / secrets in example | P0-01, P0-02 |
| Auth bypass risk | P0-03 |
| console noise | P0-04 |
| Bootstrap duplication | P0-05 |
| Scaffold README / name | P0-06, P0-08 |
| Junk assets | P0-07 |
| No CI | P1-01, P1-02 |
| Weak lint discipline | P1-03 |
| Limited error boundary / no 404 | P2-01–P2-03 |
| No code splitting / fat bundle | P3-01, P3-02 |
| Fonts/images | P3-03, P3-04 |
| Ad-hoc axios | P4-01–P4-03 |
| No tests | P5-01–P5-03 |
| Flat structure / deps | P6-01–P6-04 |
| No monitoring / a11y lint | P7-01–P7-02 |
| SEO meta | P7-03 |

---

# Definition of “production-ready” for this repo

This frontend is **production-ready for launch** when:

1. All **P0** and **P1** requirements are Done.
2. All **P2** requirements are Done.
3. **P3-01** (route splitting) and **P4-01 + P4-02** are Done.
4. **P5-01 + P5-02** are Done (minimum test set green in CI).

P6–P7 may continue post-launch without blocking a careful beta, but P0–P2 are non-negotiable.

---

# Implementation notes for agents

1. One PR per REQ-ID or tight REQ group (e.g. P0-01+P0-02 together).
2. Do not mix large folder moves (P6-02) with behavior changes.
3. Prefer measuring (file sizes, build chunk list) over guessing in PR descriptions.
4. Never enable `VITE_BYPASS_AUTH` in CI production-build jobs except to assert it is forced off.
