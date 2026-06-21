# Local development stack

Synthetic data only. No production secrets.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)
- Node.js 20+ and pnpm (for the app and seed script)
- **Ollama** installed on the host (not in Compose — needs host/GPU access)

## 1. Start infrastructure

From the repository root:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts:

| Service | Purpose | URL / port |
| --- | --- | --- |
| **postgres** | App DB (`eqa`) + Keycloak DB (`keycloak`) | `localhost:5433` (host; container stays 5432) |
| **keycloak** | OIDC (`eqa` realm, client `eqa-web`) | http://localhost:8080 |
| **clamav** | `clamd` malware scanning | `localhost:3310` |
| **minio** | S3-compatible evidence object store | API http://localhost:9000, console http://localhost:9001 |

Named volumes: `eqa_postgres_data`, `eqa_minio_data`.

**First boot notes**

- Keycloak may take 1–2 minutes (schema + realm import from `infra/keycloak/eqa-realm.json`).
- `keycloak-bootstrap` sets demo user passwords (`demo`) once Keycloak is ready.
- ClamAV downloads virus signatures on first start (several minutes; `clamd` on port 3310 may not accept connections until ready).
- `minio-init` creates the `eqa-evidence` bucket.

Check status:

```bash
docker compose -f docker-compose.dev.yml ps
```

Keycloak admin console: http://localhost:8080 — user `admin`, password `admin` (dev only).

Demo realm users (password `demo` after bootstrap): `cae.demo`, `audit.demo`, `board.demo` — tenant `seera-pilot`, roles `cae` / `audit_staff` / `board`.

**Dev MFA:** `keycloak-bootstrap` disables the Browser Conditional OTP step so demo users sign in with password only. Production enforces MFA. The realm stores a `devMfaNote` attribute documenting this.

## 2. Configure the app

```bash
cp .env.local.example .env.local
cp .env.local.example apps/web/.env.local
```

Adjust only if you changed Compose ports or credentials. Next.js reads `apps/web/.env.local`; the root copy is for `pnpm --filter @eqa/db seed` (export vars or use a dotenv loader).

If you previously set Railway `KEYCLOAK_*` variables in your shell profile, they override `.env.local` — unset them or export the localhost values before `pnpm dev`.

## 3. Ollama (host — not in Compose)

Run natively for local AI inference (GPU/host access):

```bash
ollama serve
ollama pull qwen2.5:7b
```

Default API: http://localhost:11434 (`AI_BASE_URL` in `.env.local.example`).

## 4. Seed synthetic tenant data

With Postgres up and `DATABASE_URL` set (from `.env.local` or export):

```bash
pnpm --filter @eqa/db seed
```

This creates the `seera-pilot` tenant schema and synthetic Seera demo data.

Optional KMS for local dev (see `.env.example`):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# paste into KMS_MASTER_KEY in .env.local
```

## 5. Run the web app

```bash
pnpm dev
```

App: http://localhost:3000

## Tear down

Keep data:

```bash
docker compose -f docker-compose.dev.yml down
```

Remove volumes (wipes Postgres + MinIO data):

```bash
docker compose -f docker-compose.dev.yml down -v
```

## Troubleshooting

- **Keycloak not ready** — `docker compose -f docker-compose.dev.yml logs -f keycloak` until you see `started`.
- **Demo login fails** — re-run bootstrap: `docker compose -f docker-compose.dev.yml up keycloak-bootstrap`.
- **ClamAV slow** — first signature download is normal; wait for `docker compose -f docker-compose.dev.yml logs clamav` to show `clamd` ready.
- **Port conflicts** — Compose Postgres is mapped to host **5433** so it does not clash with a native Postgres on 5432. Stop other local Keycloak/MinIO or edit port mappings in `docker-compose.dev.yml`.
