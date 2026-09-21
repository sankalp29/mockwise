# MockWise

Mock coding-interview platform: React frontend and Spring Boot API in one repository.

## Layout

- `mockwise-frontend` — Vite + React client (`http://localhost:5173`)
- `Mockwise-BE` — Spring Boot API (`http://localhost:8080`)

## Local run

Supabase login is **disabled** for now. The app runs as a guest user. Auth code is still in the tree; turn it back on with the flags below.

### Backend

```bash
cd Mockwise-BE
cp src/main/resources/application-local-secrets.yml.example \
   src/main/resources/application-local-secrets.yml
# Point spring.datasource at a local Postgres database (e.g. mockwise_local)
./scripts/run-local.sh
```

### Frontend

```bash
cd mockwise-frontend
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:8080
npm install
npm run dev
```

Open http://localhost:5173

## Restore Supabase auth

1. Frontend: set `VITE_BYPASS_AUTH=false` in `.env` and restart Vite
2. Backend: set `mockwise.auth.disabled=false` (or `MOCKWISE_AUTH_DISABLED=false`) and restart
