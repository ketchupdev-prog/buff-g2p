# Security – Buffr G2P Backend (PRD §19)

## B5 – TLS

- **Production:** Terminate HTTPS at the reverse proxy (Nginx, Caddy, or Vercel). Configure **minimum TLS 1.2** (e.g. Nginx: `ssl_protocols TLSv1.2 TLSv1.3;`, Caddy: default is TLS 1.2+).
- **Node HTTPS server:** If you run Node with `https.createServer()`, pass `minVersion: 'TLSv1.2'` in the options.

## B9 – Query / request timeout

- **Neon serverless:** Each HTTP request to Neon has a server-side timeout. Document or set `query_timeout` / `statement_timeout` in Neon project settings if needed.
- **App-level:** For long-running handlers, consider a timeout wrapper (e.g. `Promise.race` with a timeout promise) so requests do not hang indefinitely.
