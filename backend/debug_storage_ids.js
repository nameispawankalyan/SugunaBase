const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core' });

async function debugStorage() {
    try {
        console.log("--- Checking storage_files Table ---");
        const res = await pool.query("SELECT * FROM storage_files LIMIT 10");
        console.log("Samples:", JSON.stringify(res.rows, null, 2));

        console.log("\n--- Checking Project Identifiers ---");
        const projects = await pool.query("SELECT id, project_id, name FROM projects LIMIT 5");
        console.log("Projects:", JSON.stringify(projects.rows, null, 2));

    } catch (e) {
        console.error("DEBUG ERROR:", e.message);
    } finally {
        await pool.end();
    }
}
debugStorage();
