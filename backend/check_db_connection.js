const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function checkDb() {
    try {
        console.log('Testing connection...');
        const client = await pool.connect();
        console.log('✅ Connected to database successfully');

        const res = await client.query('SELECT NOW()');
        console.log('✅ Query executed successfully:', res.rows[0]);

        // Check tables
        const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('✅ Tables found:', tablesRes.rows.map(r => r.table_name));

        if (tablesRes.rows.length === 0) {
            console.log('⚠️ No tables found! Running schema migration...');
            const schemaPath = path.join(__dirname, 'database/schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                await client.query(schemaSql);
                console.log('✅ Schema applied successfully');
            } else {
                console.error('❌ Schema file not found at:', schemaPath);
            }
        }

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        if (err.code === '3D000') {
            console.error('Hint: The database "billing_system" does not exist. Please create it.');
        }
        process.exit(1);
    }
}

checkDb();
