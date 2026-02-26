const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

async function check() {
    try {
        console.log('Connecting to DB...');
        const res = await pool.query('SELECT id, name, google_sign_in_enabled FROM projects');
        console.log('Projects list:', res.rows);
    } catch (e) {
        console.error('DATABASE ERROR DETECTED:', e);
    } finally {
        await pool.end();
    }
}
check();
