const { Pool } = require('pg');

// Database connection details
const pool = new Pool({
    connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

async function enableProject() {
    try {
        console.log('Connecting to VPS Database...');

        // Update the project 'testing' to enable Google Sign-In
        const result = await pool.query(`
            UPDATE projects 
            SET google_sign_in_enabled = true 
            WHERE project_id = 'testing' OR id::text = 'testing'
            RETURNING id, project_id, name, google_sign_in_enabled
        `);

        if (result.rowCount > 0) {
            console.log('SUCCESS! Project Enabled:', result.rows[0]);
        } else {
            console.log('ERROR: Project with ID "testing" not found in database.');
        }

    } catch (e) {
        console.error('DATABASE ERROR:', e.message);
    } finally {
        await pool.end();
    }
}

enableProject();
