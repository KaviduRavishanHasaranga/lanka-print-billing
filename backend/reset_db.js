const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function resetDatabase() {
    const client = await pool.connect();
    try {
        console.log('⚠️  Resetting all database tables...\n');

        // Truncate all tables and reset sequences (CASCADE handles foreign keys)
        await client.query(`
            TRUNCATE TABLE payments, bill_items, bills, orders, customers
            RESTART IDENTITY CASCADE;
        `);

        console.log('✅ All tables truncated and sequences reset:');
        console.log('   - customers');
        console.log('   - orders');
        console.log('   - bills');
        console.log('   - bill_items');
        console.log('   - payments');
        console.log('\n🎉 Database reset complete!');
    } catch (err) {
        console.error('❌ Error resetting database:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

resetDatabase();
