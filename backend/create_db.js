const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres', // Connect to default 'postgres' db to create new db
});

async function createDatabase() {
    try {
        await client.connect();
        console.log('✅ Connected to postgres database');

        const dbName = process.env.DB_NAME;

        // Check if db exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);

        if (res.rows.length === 0) {
            console.log(`Creating database ${dbName}...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`✅ Database ${dbName} created successfully`);
        } else {
            console.log(`ℹ️ Database ${dbName} already exists`);
        }

    } catch (err) {
        console.error('❌ Error creating database:', err);
    } finally {
        await client.end();
    }
}

createDatabase();
