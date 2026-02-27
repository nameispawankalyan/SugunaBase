const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

async function run() {
    try {
        console.log('Adding is_enabled column to project_payments_config...');
        await pool.query('ALTER TABLE project_payments_config ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;');
        console.log('Column added.');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}
run();
