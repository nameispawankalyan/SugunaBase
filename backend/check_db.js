const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

async function check() {
    try {
        console.log('Connecting to DB...');
        const res = await pool.query('SELECT email, name FROM users');
        console.log('Users in DB (Count):', res.rows.length);
        console.log('Users list:', res.rows);
    } catch (e) {
        console.error('DATABASE ERROR DETECTED:', e);
    } finally {
        await pool.end();
    }
}
check();
