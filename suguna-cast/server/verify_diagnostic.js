const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

async function repair() {
    try {
        console.log('🔍 Fetching credentials for Project 15...');
        const res = await pool.query('SELECT app_id, api_secret FROM projects WHERE id = 15');

        if (res.rows.length === 0) {
            console.error('❌ Project 15 not found in database!');
            return;
        }

        const appId = res.rows[0].app_id;
        const secret = res.rows[0].api_secret.trim();

        console.log('-----------------------------------------');
        console.log('✅ DATABASE CREDENTIALS:');
        console.log('App ID:', appId);
        console.log('Secret:', secret);
        console.log('-----------------------------------------');

        const payload = {
            appId: appId,
            roomId: 'demo-room',
            uid: 'tester-professional',
            role: 'host',
            type: 'video_call'
        };

        const token = jwt.sign(payload, secret);
        console.log('🚀 COPY THIS WORKING TOKEN:');
        console.log(token);
        console.log('-----------------------------------------');
        console.log('Pasting this into App.tsx will fix the signature error.');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

repair();
