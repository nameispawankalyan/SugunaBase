const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

const createProject = async () => {
    try {
        // 1. Create Admin User
        const hashedPassword = await bcrypt.hash('password123', 10);
        let userRes = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@suguna.com']);
        let userId;

        if (userRes.rows.length === 0) {
            const newUser = await pool.query(
                'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
                ['Admin User', 'admin@suguna.com', hashedPassword]
            );
            userId = newUser.rows[0].id;
            console.log('✅ Created Admin User (ID: ' + userId + ')');
        } else {
            userId = userRes.rows[0].id;
            console.log('ℹ️ Admin User exists (ID: ' + userId + ')');
        }

        // 2. Create Project
        const projectName = "SugunaAuth Project";
        const packageName = "pawankalyan.gpk.sugunaauth";

        let projectRes = await pool.query('SELECT * FROM projects WHERE package_name = $1 AND user_id = $2', [packageName, userId]);
        let projectId;

        if (projectRes.rows.length === 0) {
            const newProject = await pool.query(
                `INSERT INTO projects (name, platform, user_id, package_name, google_sign_in_enabled, google_client_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [projectName, 'Android', userId, packageName, true, 'YOUR_GOOGLE_CLIENT_ID']
            );
            projectId = newProject.rows[0].id;
            console.log('✅ Created Project: ' + projectName + ' (ID: ' + projectId + ')');
        } else {
            console.log('ℹ️ Project exists: ' + projectName + ' (ID: ' + projectRes.rows[0].id + ')');
            // Ensure Google Auth is enabled
            await pool.query(
                `UPDATE projects SET google_sign_in_enabled = $1 WHERE id = $2`,
                [true, projectRes.rows[0].id]
            );
            console.log('✅ Updated Project Settings');
            projectId = projectRes.rows[0].id;
        }

        console.log('\n--- PROJECT ID FOR ANDROID APP ---');
        console.log('projectId: ' + projectId);
        console.log('----------------------------------\n');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
};

createProject();
