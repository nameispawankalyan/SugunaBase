const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core' });

async function check() {
    try {
        const res = await pool.query("SELECT id, name, project_id, app_id, api_secret FROM projects WHERE name = 'Testing' OR project_id = 'testing'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
