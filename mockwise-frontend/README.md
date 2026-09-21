# MockWise Frontend

React + Vite client for **MockWise**: timed mock coding interviews, feedback, and progress dashboard. Talks to the MockWise backend API and Supabase Auth.

## Prerequisites

- **Node.js 20+** (LTS recommended)
- npm 10+ (comes with Node)
- A Supabase project (URL + anon key)
- Backend API reachable (local or deployed)

## Setup

```bash
cd mockwise-frontend
npm install
cp .env.example .env
```

Edit `.env` with your real values (never commit `.env`).

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Dev server | `npm run dev` | Local HMR development |
| Production build | `npm run build` | Output to `dist/` |
| Preview build | `npm run preview` | Serve `dist/` locally |
| Lint | `npm run lint` | ESLint on the project |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (safe for client if RLS is correct) |
| `VITE_API_BASE_URL` | Yes | Backend API base URL, **no trailing slash** (e.g. `http://localhost:8080`) |
| `VITE_BYPASS_AUTH` | No | Local testing only. When `true` in **dev**, skips login UI/route guards. **Forced off in production builds.** |

Vite embeds `VITE_*` at **build time**. Set them in your host’s build environment for deploys.

## Auth bypass (local only)

Login is skipped in local/dev by default (`VITE_BYPASS_AUTH` defaults to `true`).
The backend local profile does the same via `mockwise.auth.disabled=true`.

```env
VITE_BYPASS_AUTH=true
```

- Opens protected routes without a real session.
- Backend uses a guest user (`bypass-test-user`) while auth is disabled.
- **Production builds ignore this flag** even if set (`import.meta.env.PROD`).
- Restore login with `VITE_BYPASS_AUTH=false` and `mockwise.auth.disabled=false`.

## Deploy notes

- SPA fallback: `public/_redirects` rewrites to `index.html` (Netlify-style).
- Configure the same rewrite on other hosts (e.g. nginx `try_files`).
- Build: `npm run build` with production `VITE_*` env vars set in CI/host.
- Do not set `VITE_BYPASS_AUTH=true` on production deploy jobs.

## Git workflow

- **master** = production  
- **dev** = integration (cut from `origin/master`)  
- Feature work: cut `feature/xxx` or `p0/xxx` **from `dev`**; PRs go **feature → dev**, then periodically **dev → master**.

Full detail and commands: [Git workflow](./docs/GIT_WORKFLOW.md).

## Repo layout (high level)

```text
src/           App, routes, features (home, interview, dashboard, auth)
public/        Static assets (logos, screenshots)
docs/          Engineering requirements and plans
```

## Related docs

- [Production readiness requirements](./docs/PRODUCTION_READINESS_REQUIREMENTS.md)
- [Git workflow](./docs/GIT_WORKFLOW.md)
