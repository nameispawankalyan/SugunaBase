const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3300;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

const JWT_SECRET = process.env.JWT_SECRET || 'suguna_secret_key'; // Match Gateway

app.use((req, res, next) => {
    console.log(`[AUTH] ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'Suguna Auth' }));

// --- CONSOLE AUTH ---

app.post('/signup', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate Developer ID
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const randomStr = Math.random().toString(36).substring(2, 6);
        const devId = `dev-${slug}-${randomStr}`;

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name, developer_id, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, is_active, developer_id',
            [email, hashedPassword, name, devId, 'developer']
        );
        const token = jwt.sign(
            { id: result.rows[0].id, role: result.rows[0].role, email: result.rows[0].email },
            JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.status(201).json({ user: result.rows[0], token });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`[AUTH] Login Attempt for: ${email}`);
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            console.warn(`[AUTH] User not found: ${email}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        if (!user.is_active) {
            console.warn(`[AUTH] Login blocked for deactivated account: ${email}`);
            return res.status(403).json({ error: 'Your account has been deactivated. Please contact admin.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            console.warn(`[AUTH] Password mismatch for: ${email}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log(`[AUTH] Login Success: ${email}`);
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, developer_id: user.developer_id }, token });
    } catch (e) {
        console.error(`[AUTH] Login Crash: ${e.message}`);
        res.status(500).json({ error: 'Internal Auth Error: ' + e.message });
    }
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.json({ message: 'If email exists, reset link sent.' });

        const user = result.rows[0];
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000);

        await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [resetToken, expiry, user.id]);
        res.json({ message: 'If email exists, reset link sent.', debug_token: resetToken });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()", [token]);
        if (result.rows.length === 0) return res.status(400).json({ error: "Invalid or expired token" });

        const user = result.rows[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2", [hashedPassword, user.id]);
        res.json({ message: "Password updated successfully" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- APP AUTH ---

app.post('/app-login', async (req, res) => {
    const { project_id, email, name, photo_url, google_id, provider } = req.body;
    try {
        const check = await pool.query('SELECT * FROM app_users WHERE project_id = $1 AND email = $2', [project_id, email]);

        if (provider === 'google') {
            const projectResult = await pool.query('SELECT google_sign_in_enabled FROM projects WHERE id = $1', [project_id]);
            if (projectResult.rows.length === 0) return res.status(404).json({ error: "Project not found" });
            if (!projectResult.rows[0].google_sign_in_enabled) {
                return res.status(403).json({ error: "Google Sign-In is disabled for this project" });
            }
        }

        let user;
        if (check.rows.length > 0) {
            user = check.rows[0];
            await pool.query('UPDATE app_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        } else {
            const insert = await pool.query(
                `INSERT INTO app_users (project_id, email, name, profile_pic, provider, google_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [project_id, email, name, photo_url, provider || 'email', google_id]
            );
            user = insert.rows[0];
        }

        const token = jwt.sign({ app_user_id: user.id, project_id: project_id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user, token });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🔒 Suguna Auth Microservice running on port ${port}`);
});
