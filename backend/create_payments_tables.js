const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

async function run() {
    try {
        console.log('Creating payments tables...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS project_payments_config (
                id SERIAL PRIMARY KEY,
                project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                gateway VARCHAR(50) NOT NULL, -- 'razorpay', 'cashfree', 'google_play'
                api_key TEXT,
                api_secret TEXT,
                webhook_url TEXT,
                webhook_secret TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, gateway)
            );
        `);
        console.log('Created project_payments_config table.');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(100) PRIMARY KEY, -- Internal Txn ID
                project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                app_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                order_id VARCHAR(255), -- Gateway Order ID or Product ID
                amount NUMERIC(10, 2) NOT NULL,
                currency VARCHAR(10) NOT NULL,
                item_type VARCHAR(50),
                quantity INTEGER,
                gateway VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created transactions table.');

    } catch (e) {
        console.error('Error creating tables:', e);
    } finally {
        await pool.end();
    }
}

run();
