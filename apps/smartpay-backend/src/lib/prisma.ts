/**
 * Prisma client shim (temporary).
 * Location: fintech/apps/smartpay-backend/src/lib/prisma.ts
 *
 * Purpose:
 * - Unblocks TypeScript builds for OBS modules that currently reference `prisma.*`
 * - These modules were authored assuming a Prisma data layer, but the monorepo backend
 *   currently uses `pg` (`src/lib/db.ts`) for most services.
 *
 * Next step (recommended):
 * - Replace this shim by either:
 *   1) implementing OBS persistence using `pg` + migrations, or
 *   2) properly introducing Prisma with a complete schema and generation pipeline.
 */
export const prisma: any = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new Error(
        `Prisma client is not configured (attempted access: prisma.${String(prop)}). ` +
          `Implement OBS persistence or wire Prisma properly before using OBS routes.`
      );
    },
  }
);

