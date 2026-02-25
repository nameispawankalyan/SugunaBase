const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

async function checkUsers() {
    try {
        console.log('Connecting to DB...');
        const res = await pool.query('SELECT id, email, role, is_active FROM users');
        console.log('--- USERS IN DB ---');
        console.table(res.rows);
        await pool.end();
    } catch (err) {
        console.error('CRITICAL DB ERROR:', err);
        process.exit(1);
    }
}

checkUsers();
