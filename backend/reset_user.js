const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

async function reset() {
    const email = 'pawankalyan@suguna.co';
    const newPassword = 'password123';
    try {
        console.log(`Resetting password for ${email}...`);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const res = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id',
            [hashedPassword, email]
        );
        if (res.rows.length > 0) {
            console.log('✅ Password reset successful!');
        } else {
            console.log('❌ User not found. Creating user...');
            await pool.query(
                'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)',
                [email, hashedPassword, 'Pawan Kalyan']
            );
            console.log('✅ User created and password set!');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
reset();
