const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

async function check() {
    try {
        const res = await pool.query('SELECT id, name, api_secret FROM projects WHERE id = 15');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
