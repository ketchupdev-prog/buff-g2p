# Fineract connection (Buffr G2P backend)

Backend connects to **Apache Fineract** at **dev.ketchup.cc** for core banking (clients, accounts, transactions). This doc covers env vars and how to set up Fineract from scratch on dev.ketchup.cc.

---

## 1. Backend .env (dev.ketchup.cc)

In `backend/.env`:

| Variable | Value | Purpose |
|----------|--------|---------|
| `FINERACT_ENABLED` | `true` | Enable Fineract API calls |
| `FINERACT_BASE_URL` | `https://dev.ketchup.cc` | Fineract host (no trailing slash) |
| `FINERACT_USERNAME` | `mifos` | Default Fineract API user |
| `FINERACT_PASSWORD` | `password` | Default Fineract API password |
| `FINERACT_TENANT_ID` | `default` | Default tenant identifier |
| `FINERACT_API_VERSION` | `v1` | API version path segment |
| `FINERACT_TIMEOUT_SECONDS` | `30` | Request timeout |
| `FINERACT_USE_HTTPS` | `true` | Use HTTPS for dev.ketchup.cc |

**Resolved API base:**  
`https://dev.ketchup.cc/fineract-provider/api/v1`

If Fineract is deployed under a different path on dev.ketchup.cc, set `FINERACT_BASE_URL` to the full base, e.g.  
`https://dev.ketchup.cc/your-context/fineract-provider/api/v1`.

---

## 2. Set up Fineract on dev.ketchup.cc from scratch

### Official documentation

- **Apache Fineract docs (current):** https://fineract.apache.org/docs/current/  
- **Fineract Academy – Docker setup:** https://fineract-academy.com/how-to-setup-fineract-with-docker/  
- **Docker image:** https://hub.docker.com/r/apache/fineract  
- **API reference / Swagger:** https://demo.fineract.dev/fineract-provider/swagger-ui/index.html  

### Default credentials (fresh install)

- **Tenant:** `default`  
- **Username:** `mifos`  
- **Password:** `password`  
- **API base path:** `/fineract-provider/api/v1` (or `/fineract-provider/api/v1/`)

### Option A: Docker on the dev.ketchup.cc server

**1. Database (choose one)**

**PostgreSQL (recommended for production):**
```bash
docker run --name fineract-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

**MariaDB 11.5.2+ (per Fineract docs):**
```bash
docker run --name mariadb-11.5 -p 3306:3306 -e MARIADB_ROOT_PASSWORD=mysql -d mariadb:11.5.2
```

**2. Fineract backend**

Configure tenant DB via environment variables (see [Fineract docs](https://fineract.apache.org/docs/current/) and [Fineract Academy](https://fineract-academy.com/how-to-setup-fineract-with-docker/)). Example with PostgreSQL:

```bash
docker run -d -p 8443:8443 \
  -e FINERACT_HIKARI_DRIVER_SOURCE_CLASS_NAME=org.postgresql.Driver \
  -e FINERACT_HIKARI_JDBC_URL=jdbc:postgresql://host.docker.internal:5432/fineract_tenants \
  -e FINERACT_HIKARI_USERNAME=postgres \
  -e FINERACT_HIKARI_PASSWORD=postgres \
  -e FINERACT_DEFAULT_TENANTDB_IDENTIFIER=default \
  apache/fineract:latest
```

Create DBs (e.g. `fineract_tenants`, `fineract_default`) and run Fineract migrations as per official docs.

**3. Reverse proxy (Nginx / Caddy) on dev.ketchup.cc**

Expose Fineract on HTTPS so the backend can use `https://dev.ketchup.cc/fineract-provider/api/v1`:

- Host: `dev.ketchup.cc` (or a subdomain, e.g. `fineract.dev.ketchup.cc`).
- Proxy `/fineract-provider` to `http://localhost:8443/fineract-provider` (or the container’s host/port).
- Use TLS (e.g. Let’s Encrypt) so `FINERACT_USE_HTTPS=true` works.

**4. Verify**

- Health: `https://dev.ketchup.cc/fineract-provider/actuator/health` → `{"status":"UP"}`.
- API: `curl -u "mifos:password" -H "Fineract-Platform-TenantId: default" "https://dev.ketchup.cc/fineract-provider/api/v1/offices"` → 200 and JSON.

Then run from the backend repo:

```bash
cd backend && npm run fineract:check
```

### Option B: Docker Compose (local or server)

Use the Compose file from the [Apache Fineract repo](https://github.com/apache/fineract) (e.g. `docker-compose-postgresql.yml` or `docker-compose-development.yml`). Point the proxy on dev.ketchup.cc at the Fineract container port (e.g. 8443) and set `FINERACT_BASE_URL=https://dev.ketchup.cc` in `backend/.env`.

### Requirements (from Fineract docs)

- **Java:** 21+ (Azul Zulu is used in CI).  
- **DB:** PostgreSQL or MariaDB 11.5.2+; timezone UTC recommended.  
- **Context path:** Default is `/fineract-provider`; API under `/api/v1`.

---

## 3. Backend API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/mobile/fineract/health` | Connectivity status |
| GET | `/api/v1/fineract/offices` | Proxies Fineract `GET /offices` |

---

## 4. Verify connectivity

From repo root or `backend/`:

```bash
npm run fineract:check
```

Or curl directly:

```bash
curl -u "mifos:password" \
  -H "Fineract-Platform-TenantId: default" \
  -H "Content-Type: application/json" \
  "https://dev.ketchup.cc/fineract-provider/api/v1/offices"
```

---

## 5. Web UI (optional)

To log in via the browser:

- **Community App (if deployed):** Often at `https://dev.ketchup.cc:9090` or a path you configure; login with `mifos` / `password`, tenant `default`.  
- **Swagger UI:** `https://dev.ketchup.cc/fineract-provider/swagger-ui/index.html` (after accepting the cert if self-signed).

---

## 6. Changing credentials or tenant

After creating a dedicated API user or tenant in Fineract, update `backend/.env`:

- `FINERACT_USERNAME` / `FINERACT_PASSWORD`  
- `FINERACT_TENANT_ID` if not using `default`  

Restart the backend and run `npm run fineract:check` again.
