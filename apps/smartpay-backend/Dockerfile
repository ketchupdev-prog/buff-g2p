# SmartPay Node API — monorepo-aware image.
# Build from `fintech/`:
#   docker build -f apps/smartpay-backend/Dockerfile -t smartpay-backend .
#
# Runs with tsx so the service starts without a passing `tsc` build (the workspace
# currently has TypeScript errors under strict checking). When `npm run build`
# succeeds, switch CMD to `node dist/index.js` and restore a compile step.

FROM node:20-bookworm-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY packages ./packages
COPY apps/smartpay-backend ./apps/smartpay-backend

WORKDIR /app/apps/smartpay-backend

# file: deps to ../../packages/*; include devDependencies for tsx at runtime
RUN npm install

FROM node:20-bookworm-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r -g 1001 smartpay \
    && useradd -r -u 1001 -g smartpay smartpay

WORKDIR /app

COPY --from=deps --chown=smartpay:smartpay /app/packages ./packages
COPY --from=deps --chown=smartpay:smartpay /app/apps/smartpay-backend ./apps/smartpay-backend

WORKDIR /app/apps/smartpay-backend

USER smartpay

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["npx", "tsx", "src/index.ts"]
