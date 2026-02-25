const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

async function reset() {
    const email = 'pawankalyan@suguna.co';
    const newPassword = '9492293702@';
    try {
        console.log(`Resetting password for ${email}...`);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const res = await pool.query(
            'UPDATE users SET password_hash = $1, role = \'admin\' WHERE email = $2 RETURNING id',
            [hashedPassword, email]
        );
        if (res.rows.length > 0) {
            console.log('✅ Password reset and Admin role set!');
        } else {
            console.log('❌ User not found. Creating admin user...');
            await pool.query(
                'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, \'admin\')',
                [email, hashedPassword, 'Pawan Kalyan']
            );
            console.log('✅ Admin user created and password set!');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
reset();
