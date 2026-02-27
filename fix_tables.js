const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core' });

async function run() {
    console.log("Starting DB fix...");
    const tables = ['firestore_data', 'hosting_sites', 'functions_deployments'];

    for (const table of tables) {
        try {
            const res = await pool.query(`
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = 'project_id'
            `, [table]);
            if (res.rows.length > 0) {
                console.log(`${table}.project_id type is: ${res.rows[0].data_type}`);
                if (res.rows[0].data_type === 'integer') {
                    await pool.query(`ALTER TABLE ${table} ALTER COLUMN project_id TYPE VARCHAR(100) USING project_id::text`);
                    console.log(`-> Migrated ${table}.project_id to VARCHAR(100)`);
                }
            } else {
                console.log(`${table}.project_id NOT FOUND`);
            }
        } catch (e) { console.error('Err on ' + table, e); }
    }
    await pool.end();
    console.log("Done checking tables.");
}
run();
