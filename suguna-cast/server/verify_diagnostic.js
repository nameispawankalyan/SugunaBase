const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6ImQ1MGQyNDJiZGFiNThjNWVkOGM5NzM0NmE3N2NjNjNhIiwicm9vbUlkIjoiZGVtby1yb29tIiwidWlkIjoidGVzdGVyLXByb2Zlc3Npb25hbCIsInJvbGUiOiJob3N0IiwidHlwZSI6InZpZGVvX2NhbGwiLCJpYXQiOjE3NDAzMjIyNzl9.VNhbsONDXD7VgjyPSlPRDOHGbU_RAhmSZJG06dsiwW4";

async function verify() {
    try {
        const decoded = jwt.decode(token);
        console.log('Decoded AppID:', decoded.appId);

        const res = await pool.query('SELECT api_secret FROM projects WHERE app_id = $1', [decoded.appId]);
        if (res.rows.length === 0) {
            console.error('Project not found in DB!');
            return;
        }

        const secret = res.rows[0].api_secret;
        console.log('Found Secret in DB (first 4):', secret.substring(0, 4));

        jwt.verify(token, secret);
        console.log('✅ Local Verification SUCCESS!');
    } catch (err) {
        console.error('❌ Verification FAILED:', err.message);
    } finally {
        await pool.end();
    }
}

verify();
