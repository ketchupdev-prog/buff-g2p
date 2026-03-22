/**
 * Seed Data Script
 * Populate database with test data for development
 * Following Buffr G2P patterns
 */

import { sql } from '../src/lib/db';

interface SeedUser {
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
}

const seedUsers: SeedUser[] = [
  {
    phone: '+26481234567',
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe'
  },
  {
    phone: '+26481234568',
    email: 'jane.smith@example.com',
    first_name: 'Jane',
    last_name: 'Smith'
  },
  {
    phone: '+26481234569',
    email: 'bob.johnson@example.com',
    first_name: 'Bob',
    last_name: 'Johnson'
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Clear existing data (development only!)
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️  Clearing existing data...');
      
      await sql`TRUNCATE TABLE 
        wallet_transactions,
        p2p_transactions,
        group_contributions,
        group_wallets,
        cash_out_codes,
        voucher_redemptions,
        vouchers,
        loans,
        wallets,
        otp_codes,
        user_sessions,
        refresh_tokens,
        analytics_events,
        audit_logs,
        users
        CASCADE`;
      
      console.log('✅ Existing data cleared\n');
    }

    // Seed users
    console.log('👥 Creating users...');
    const userIds: string[] = [];
    
    for (const userData of seedUsers) {
      const full_name = `${userData.first_name} ${userData.last_name}`;
      
      const rows = await sql`
        INSERT INTO users (phone, email, first_name, last_name, full_name, wallet_status)
        VALUES (
          ${userData.phone},
          ${userData.email},
          ${userData.first_name},
          ${userData.last_name},
          ${full_name},
          'active'
        )
        RETURNING id
      `;
      
      userIds.push(rows[0].id);
      console.log(`  ✓ Created user: ${full_name} (${userData.phone})`);
    }
    
    console.log(`✅ Created ${userIds.length} users\n`);

    // Seed wallets
    console.log('💼 Creating wallets...');
    const walletIds: { [userId: string]: string[] } = {};
    
    for (const userId of userIds) {
      walletIds[userId] = [];
      
      // Main wallet
      const mainWallet = await sql`
        INSERT INTO wallets (user_id, name, type, balance, currency, is_primary)
        VALUES (${userId}, 'Main Wallet', 'main', 1000, 'NAD', true)
        RETURNING id
      `;
      walletIds[userId].push(mainWallet[0].id);
      
      // Savings wallet
      const savingsWallet = await sql`
        INSERT INTO wallets (user_id, name, type, balance, currency, is_primary)
        VALUES (${userId}, 'Savings', 'savings', 500, 'NAD', false)
        RETURNING id
      `;
      walletIds[userId].push(savingsWallet[0].id);
      
      console.log(`  ✓ Created 2 wallets for user ${userId.slice(0, 8)}...`);
    }
    
    console.log(`✅ Created wallets for ${userIds.length} users\n`);

    // Seed vouchers
    console.log('🎫 Creating vouchers...');
    let voucherCount = 0;
    
    for (const userId of userIds) {
      // Available voucher
      await sql`
        INSERT INTO vouchers (user_id, amount, currency, status, programme, expires_at)
        VALUES (
          ${userId},
          1500,
          'NAD',
          'available',
          'Social Grant - March 2026',
          ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}
        )
      `;
      voucherCount++;
      
      // Redeemed voucher
      await sql`
        INSERT INTO vouchers (user_id, amount, currency, status, programme, expires_at)
        VALUES (
          ${userId},
          1500,
          'NAD',
          'redeemed',
          'Social Grant - February 2026',
          ${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()}
        )
      `;
      voucherCount++;
      
      console.log(`  ✓ Created 2 vouchers for user ${userId.slice(0, 8)}...`);
    }
    
    console.log(`✅ Created ${voucherCount} vouchers\n`);

    // Seed transactions
    console.log('💸 Creating sample transactions...');
    let txCount = 0;
    
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const walletId = walletIds[userId][0]; // Main wallet
      
      // Voucher redemption transaction
      await sql`
        INSERT INTO wallet_transactions (
          wallet_id, type, amount, description, created_at
        )
        VALUES (
          ${walletId},
          'voucher_redeem',
          1500,
          'February social grant redemption',
          ${new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()}
        )
      `;
      txCount++;
      
      // Some P2P transactions
      if (i < userIds.length - 1) {
        const recipientId = userIds[i + 1];
        const recipientWalletId = walletIds[recipientId][0];
        
        // Create P2P transaction record
        const p2pTx = await sql`
          INSERT INTO p2p_transactions (
            sender_id, recipient_id, wallet_id, amount, note, status, created_at
          )
          VALUES (
            ${userId},
            ${recipientId},
            ${walletId},
            100,
            'Test transfer',
            'completed',
            ${new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()}
          )
          RETURNING id
        `;
        
        // Wallet transactions for P2P
        await sql`
          INSERT INTO wallet_transactions (
            wallet_id, type, amount, reference_id, description, created_at
          )
          VALUES 
            (
              ${walletId},
              'send',
              -100,
              ${p2pTx[0].id},
              'Sent to friend',
              ${new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()}
            ),
            (
              ${recipientWalletId},
              'receive',
              100,
              ${p2pTx[0].id},
              'Received from friend',
              ${new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()}
            )
        `;
        txCount += 2;
      }
      
      console.log(`  ✓ Created transactions for user ${userId.slice(0, 8)}...`);
    }
    
    console.log(`✅ Created ${txCount} transactions\n`);

    // Summary
    console.log('📊 Seeding Summary:');
    console.log(`   - Users: ${userIds.length}`);
    console.log(`   - Wallets: ${userIds.length * 2}`);
    console.log(`   - Vouchers: ${voucherCount}`);
    console.log(`   - Transactions: ${txCount}`);
    console.log('\n✅ Database seeding completed successfully!\n');

    // Print test credentials
    console.log('🔑 Test User Credentials:');
    seedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`      Phone: ${user.phone}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      User ID: ${userIds[index]}\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
