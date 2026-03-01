#!/usr/bin/env node
/**
 * Seed database from canonical demo seed (mobile/seed-data/demo.json).
 * Idempotent: only runs when no users exist. Run after migrate.
 * Usage: npm run db:seed (from backend) or node backend/scripts/seed-db.mjs
 */

import { config } from "dotenv";
import { resolve, dirname, join } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
config({ path: resolve(root, "backend/.env") });
config({ path: resolve(root, "backend/.env.local") });
config({ path: resolve(root, ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set. Add backend/.env");
  process.exit(1);
}

const demoPath = join(root, "mobile/seed-data/demo.json");
let demo;
try {
  demo = JSON.parse(readFileSync(demoPath, "utf8"));
} catch (e) {
  console.error("Failed to read demo.json at", demoPath, e.message);
  process.exit(1);
}

const now = new Date();
function daysAgo(d) {
  const dt = new Date(now);
  dt.setDate(dt.getDate() - d);
  return dt;
}
function daysFromNow(d) {
  const dt = new Date(now);
  dt.setDate(dt.getDate() + d);
  return dt;
}

async function main() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(DATABASE_URL);

  const existing = await sql`SELECT id FROM users LIMIT 1`;
  if (existing.length > 0) {
    console.log("Seed skipped: users already exist.");
    process.exit(0);
  }

  const userId = crypto.randomUUID();
  const userByContactId = {};
  const contactUsers = [];
  for (let i = 0; i < demo.contacts.length; i++) {
    const c = demo.contacts[i];
    const uid = crypto.randomUUID();
    contactUsers.push({
      id: uid,
      phone: c.phone,
      firstName: (c.name || "").split(" ")[0] || "User",
      lastName: (c.name || "").split(" ").slice(1).join(" ") || "",
    });
    userByContactId[c.id] = uid;
  }

  await sql`
    INSERT INTO users (id, phone, first_name, last_name, wallet_status, created_at, updated_at)
    VALUES (
      ${userId},
      ${demo.demoUser.phone},
      ${demo.demoUser.firstName},
      ${demo.demoUser.lastName},
      'active',
      ${daysAgo(90)},
      ${now}
    )
  `;
  console.log("Inserted demo user");

  for (const u of contactUsers) {
    await sql`
      INSERT INTO users (id, phone, first_name, last_name, wallet_status, created_at, updated_at)
      VALUES (${u.id}, ${u.phone}, ${u.firstName}, ${u.lastName}, 'active', ${now}, ${now})
    `;
  }
  console.log("Inserted", contactUsers.length, "contact users");

  const walletIds = {};
  for (const w of demo.wallets) {
    const wid = crypto.randomUUID();
    walletIds[w.id] = wid;
    const createdAt = w.createdAtDaysAgo != null ? daysAgo(w.createdAtDaysAgo) : now;
    await sql`
      INSERT INTO wallets (id, user_id, name, type, balance, currency, created_at, updated_at)
      VALUES (${wid}, ${userId}, ${w.name}, ${w.type}, ${Number(w.balance)}, ${w.currency}, ${createdAt}, ${now})
    `;
  }
  console.log("Inserted", demo.wallets.length, "wallets");

  for (const t of demo.transactions) {
    const wid = walletIds[t.walletId];
    if (!wid) continue;
    const createdAt = t.createdAtDaysAgo != null ? daysAgo(t.createdAtDaysAgo) : now;
    await sql`
      INSERT INTO wallet_transactions (wallet_id, type, amount, description, created_at)
      VALUES (${wid}, ${t.type}, ${Number(t.amount)}, ${t.description || ""}, ${createdAt})
    `;
  }
  console.log("Inserted", demo.transactions.length, "wallet transactions");

  for (const v of demo.vouchers) {
    const vid = crypto.randomUUID();
    const issuedAt = v.issuedAtDaysAgo != null ? daysAgo(v.issuedAtDaysAgo) : now;
    const expiresAt = v.expiresAtDaysFromNow != null
      ? daysFromNow(v.expiresAtDaysFromNow)
      : v.expiresAtDaysAgo != null
        ? daysAgo(v.expiresAtDaysAgo)
        : daysFromNow(60);
    await sql`
      INSERT INTO vouchers (id, user_id, amount, currency, status, type, expires_at, created_at)
      VALUES (${vid}, ${userId}, ${Number(v.amount)}, ${v.currency}, ${v.status}, ${v.programme}, ${expiresAt}, ${issuedAt})
    `;
    if (v.status === "redeemed" && v.redeemedAtDaysAgo != null) {
      const redeemedAt = daysAgo(v.redeemedAtDaysAgo);
      await sql`
        INSERT INTO voucher_redemptions (voucher_id, user_id, method, amount_credited, redeemed_at)
        VALUES (${vid}, ${userId}, ${v.redeemedMethod || "wallet"}, ${Number(v.amount)}, ${redeemedAt})
      `;
    }
  }
  console.log("Inserted", demo.vouchers.length, "vouchers");

  for (const n of demo.notifications || []) {
    const createdAt = n.createdAtDaysAgo != null ? daysAgo(n.createdAtDaysAgo) : now;
    await sql`
      INSERT INTO notifications (user_id, type, title, body, created_at)
      VALUES (${userId}, ${n.type}, ${n.title || ""}, ${n.body || ""}, ${createdAt})
    `;
  }
  console.log("Inserted", (demo.notifications || []).length, "notifications");

  if (Array.isArray(demo.groups) && demo.groups.length > 0) {
    for (const g of demo.groups) {
      const gid = crypto.randomUUID();
      const createdAt = g.createdAtDaysAgo != null ? daysAgo(g.createdAtDaysAgo) : now;
      await sql`
        INSERT INTO groups (id, name, description, created_by, created_at)
        VALUES (${gid}, ${g.name}, ${g.description || null}, ${userId}, ${createdAt})
      `;
      await sql`
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (${gid}, ${userId}, 'admin')
      `;
      const memberIds = g.memberContactIds || [];
      for (const cid of memberIds) {
        const uid = userByContactId[cid];
        if (uid) {
          await sql`
            INSERT INTO group_members (group_id, user_id, role)
            VALUES (${gid}, ${uid}, 'member')
            ON CONFLICT (group_id, user_id) DO NOTHING
          `;
        }
      }
    }
    console.log("Inserted", demo.groups.length, "groups with members");
  }

  console.log("Seed done. Demo user is first user by created_at.");
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
