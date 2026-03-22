/**
 * Seed Test Data for Development/Testing ONLY
 * Location: fintech/smartpay/backend/scripts/seedTestData.ts
 *
 * Creates mock users (Anna, Ben, Catherine), wallets, data providers, etc.
 * Do NOT run in production. Use the same canonical test user as Buffr Connect
 * (TEST_USER_EMAIL / TEST_USER_PASSWORD) for E2E and OBS consent; ensureUser() creates
 * real user rows on first sign-in.
 *
 * Usage: SEED_DEV_DATA=1 DATABASE_URL=... npx tsx scripts/seedTestData.ts
 */
import { pool } from '../src/lib/db';
import { v4 as uuidv4 } from 'uuid';

const SEED_DEV_DATA = process.env.SEED_DEV_DATA === '1';
const NODE_ENV = process.env.NODE_ENV ?? 'development';

async function seedTestData() {
  if (!SEED_DEV_DATA) {
    console.error('❌ Refusing to seed: set SEED_DEV_DATA=1 to seed dev-only test data.');
    console.error('   Production must NOT use mock users. Use canonical test user (TEST_USER_*) for E2E.');
    process.exit(1);
  }
  if (NODE_ENV === 'production') {
    console.error('❌ Refusing to seed: NODE_ENV=production. Seed only in development/test.');
    process.exit(1);
  }

  console.log('🌱 Seeding dev-only test data (SEED_DEV_DATA=1)...');

  try {
    await pool.query('BEGIN');

    console.log('Creating test users...');
    const users = [
      {
        id: uuidv4(),
        phone: '+264811111111',
        firstName: 'Anna',
        lastName: 'Shikongo',
        kycTier: 'basic',
        status: 'active',
      },
      {
        id: uuidv4(),
        phone: '+264812222222',
        firstName: 'Ben',
        lastName: 'Uusiku',
        kycTier: 'standard',
        status: 'active',
      },
      {
        id: uuidv4(),
        phone: '+264813333333',
        firstName: 'Catherine',
        lastName: 'Namene',
        kycTier: 'premium',
        status: 'active',
      },
    ];

    for (const user of users) {
      await pool.query(
        `INSERT INTO users (id, phone, first_name, last_name, kyc_tier, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (phone) DO NOTHING`,
        [user.id, user.phone, user.firstName, user.lastName, user.kycTier, user.status]
      );
      console.log(`  ✓ User ${user.firstName} ${user.lastName} (${user.kycTier})`);
    }

    console.log('Creating test wallets...');
    for (const user of users) {
      const walletId = uuidv4();
      const balance = user.kycTier === 'basic' ? 1500 : user.kycTier === 'standard' ? 5000 : 15000;
      
      await pool.query(
        `INSERT INTO wallets (id, user_id, balance, currency, frozen, created_at)
         VALUES ($1, $2, $3, 'NAD', false, NOW())
         ON CONFLICT DO NOTHING`,
        [walletId, user.id, balance]
      );
      console.log(`  ✓ Wallet for ${user.firstName}: N$${balance}`);
    }

    console.log('Creating test beneficiaries...');
    const beneficiaries = [
      { name: 'Anna Shikongo', phone: '+264811234567', walletId: users[0].id },
      { name: 'Ben Uusiku', phone: '+264819876543', walletId: users[1].id },
    ];

    for (const ben of beneficiaries) {
      await pool.query(
        `INSERT INTO beneficiaries (id, user_id, name, phone, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT DO NOTHING`,
        [uuidv4(), users[0].id, ben.name, ben.phone]
      );
      console.log(`  ✓ Beneficiary: ${ben.name}`);
    }

    console.log('Creating test vouchers...');
    const vouchers = [
      { code: 'VCH-TEST-001', amount: 500, status: 'active' },
      { code: 'VCH-TEST-002', amount: 1000, status: 'active' },
      { code: 'VCH-TEST-003', amount: 2500, status: 'active' },
    ];

    for (const voucher of vouchers) {
      await pool.query(
        `INSERT INTO vouchers (id, voucher_code, amount, status, issuer, created_at, expires_at)
         VALUES ($1, $2, $3, $4, 'Ministry of Social Services', NOW(), NOW() + INTERVAL '90 days')
         ON CONFLICT DO NOTHING`,
        [uuidv4(), voucher.code, voucher.amount, voucher.status]
      );
      console.log(`  ✓ Voucher: ${voucher.code} (N$${voucher.amount})`);
    }

    console.log('Creating test group wallets...');
    const groupId = uuidv4();
    await pool.query(
      `INSERT INTO group_wallets (id, name, balance, member_count, created_at)
       VALUES ($1, 'Community Savings Group', 8500, 12, NOW())
       ON CONFLICT DO NOTHING`,
      [groupId]
    );
    console.log(`  ✓ Group Wallet: Community Savings Group (N$8500)`);

    console.log('Creating test agents...');
    const agents = [
      {
        name: 'NamPost Main Street',
        latitude: -22.5707,
        longitude: 17.0837,
        city: 'Windhoek',
        services: ['cashout', 'voucher_redemption'],
      },
      {
        name: 'OK Foods Khomasdal',
        latitude: -22.5820,
        longitude: 17.0550,
        city: 'Windhoek',
        services: ['cashout'],
      },
      {
        name: 'Bank Windhoek ATM',
        latitude: -22.5698,
        longitude: 17.0870,
        city: 'Windhoek',
        services: ['atm'],
      },
    ];

    for (const agent of agents) {
      await pool.query(
        `INSERT INTO agent_pos_locations (id, agent_name, latitude, longitude, city, services, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
         ON CONFLICT DO NOTHING`,
        [uuidv4(), agent.name, agent.latitude, agent.longitude, agent.city, agent.services]
      );
      console.log(`  ✓ Agent: ${agent.name}`);
    }

    console.log('Creating test data providers...');
    const dataProviders = [
      {
        providerCode: 'FNB',
        providerName: 'First National Bank',
        authorizationEndpoint: 'https://obs-sandbox.fnb.com.na/authorize',
        tokenEndpoint: 'https://obs-sandbox.fnb.com.na/token',
        accountsEndpoint: 'https://obs-sandbox.fnb.com.na/api/v1/accounts',
        balancesEndpoint: 'https://obs-sandbox.fnb.com.na/api/v1/balances',
        transactionsEndpoint: 'https://obs-sandbox.fnb.com.na/api/v1/transactions',
      },
      {
        providerCode: 'BWHO',
        providerName: 'Bank Windhoek',
        authorizationEndpoint: 'https://obs-api.bankwindhoek.com.na/authorize',
        tokenEndpoint: 'https://obs-api.bankwindhoek.com.na/token',
        accountsEndpoint: 'https://obs-api.bankwindhoek.com.na/ais/accounts',
        balancesEndpoint: 'https://obs-api.bankwindhoek.com.na/ais/balances',
        transactionsEndpoint: 'https://obs-api.bankwindhoek.com.na/ais/transactions',
      },
    ];

    for (const provider of dataProviders) {
      await pool.query(
        `INSERT INTO data_providers (
          id, provider_code, provider_name, authorization_endpoint,
          token_endpoint, accounts_endpoint, balances_endpoint,
          transactions_endpoint, is_active, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
         ON CONFLICT (provider_code) DO NOTHING`,
        [
          uuidv4(),
          provider.providerCode,
          provider.providerName,
          provider.authorizationEndpoint,
          provider.tokenEndpoint,
          provider.accountsEndpoint,
          provider.balancesEndpoint,
          provider.transactionsEndpoint,
        ]
      );
      console.log(`  ✓ Data Provider: ${provider.providerName}`);
    }

    console.log('Creating fee schedules...');
    const feeSchedules = [
      {
        paymentStream: 'p2p',
        transactionType: 'send_money',
        channel: 'mobile_app',
        feeFlat: 5.0,
        feePercentage: 0.01,
        feeCap: 50.0,
      },
      {
        paymentStream: 'p2p',
        transactionType: 'cashout_bank',
        channel: 'mobile_app',
        feeFlat: 10.0,
        feePercentage: 0.015,
        feeCap: 100.0,
      },
    ];

    for (const fee of feeSchedules) {
      await pool.query(
        `INSERT INTO transaction_fee_schedule (
          id, payment_stream, transaction_type, channel,
          fee_flat, fee_percentage, fee_cap, tier_min, tier_max,
          vat_inclusive, effective_from, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NULL, false, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [
          uuidv4(),
          fee.paymentStream,
          fee.transactionType,
          fee.channel,
          fee.feeFlat,
          fee.feePercentage,
          fee.feeCap,
        ]
      );
      console.log(`  ✓ Fee schedule: ${fee.transactionType} (N$${fee.feeFlat} + ${fee.feePercentage * 100}%)`);
    }

    await pool.query('COMMIT');
    console.log('\n✅ Dev-only test data seeded successfully!');
    console.log('\nTest Accounts (dev only – do not use in production):');
    console.log('  Basic:    +264811111111 (Anna Shikongo, N$1500)');
    console.log('  Standard: +264812222222 (Ben Uusiku, N$5000)');
    console.log('  Premium:  +264813333333 (Catherine Namene, N$15000)');
    console.log('\nFor E2E/OBS use canonical test user: TEST_USER_EMAIL / TEST_USER_PASSWORD (match Buffr Connect .env.test).\n');

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedTestData().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { seedTestData };
