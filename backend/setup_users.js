const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function setupUsers() {
    const client = await pool.connect();
    try {
        console.log('⚙️  Setting up users table...\n');

        // Create users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'staff')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Users table created');

        // Check if admin user already exists
        const existing = await client.query(`SELECT id FROM users WHERE username = 'admin'`);
        if (existing.rows.length > 0) {
            console.log('ℹ️  Admin user already exists, skipping seed.');
        } else {
            // Create default admin user
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await client.query(
                `INSERT INTO users (username, password_hash, display_name, role) VALUES ($1, $2, $3, $4)`,
                ['admin', hashedPassword, 'Admin', 'admin']
            );
            console.log('✅ Default admin user created');
            console.log('   Username: admin');
            console.log('   Password: admin123');
        }

        console.log('\n🎉 Users setup complete!');
    } catch (err) {
        console.error('❌ Error setting up users:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

setupUsers();
