const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core' });

async function check() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'storage_files'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
