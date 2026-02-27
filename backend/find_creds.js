const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core' });

async function getCredentials() {
    try {
        const res = await pool.query("SELECT id, name, app_id, api_secret FROM projects WHERE name = 'Testing' OR project_id = 'testing'");
        if (res.rows.length === 0) {
            console.log("No project found with name 'Testing'. Check all projects:");
            const all = await pool.query("SELECT id, name, app_id, api_secret FROM projects");
            console.table(all.rows);
        } else {
            console.log("--- Credentials for 'Testing' Project ---");
            console.table(res.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
getCredentials();
