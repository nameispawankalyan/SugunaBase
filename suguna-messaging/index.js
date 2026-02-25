const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3200;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

const firebaseApps = new Map();

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'Suguna Messaging' }));

const getFirebaseAdmin = async (projectId) => {
    if (firebaseApps.has(projectId)) return firebaseApps.get(projectId);

    try {
        const result = await pool.query('SELECT fcm_service_account FROM projects WHERE id = $1', [projectId]);
        if (result.rows.length === 0 || !result.rows[0].fcm_service_account) {
            return null;
        }

        const serviceAccount = result.rows[0].fcm_service_account;
        const appName = `project_${projectId}`;

        let firebaseApp;
        if (admin.apps.some(a => a.name === appName)) {
            firebaseApp = admin.app(appName);
        } else {
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            }, appName);
        }

        firebaseApps.set(projectId, firebaseApp);
        return firebaseApp;
    } catch (e) {
        console.error(`[SCM Engine] Firebase Init Error for Project ${projectId}:`, e.message);
        return null;
    }
};

// 1. Register Device Token
app.post('/register', async (req, res) => {
    const { project_id, app_user_id, fcm_token, device_id, platform } = req.body;
    if (!fcm_token) return res.status(400).json({ error: "FCM Token required" });

    try {
        await pool.query(`
            INSERT INTO messaging_tokens (project_id, app_user_id, fcm_token, device_id, platform)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (project_id, app_user_id, fcm_token) 
            DO UPDATE SET created_at = CURRENT_TIMESTAMP
        `, [project_id, app_user_id, fcm_token, device_id, platform || 'android']);
        res.json({ message: "Token registered successfully" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Send Notification Engine (Improved with Analytics)
app.post('/send/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const { target, title, body, image_url, data } = req.body;

    const firebaseApp = await getFirebaseAdmin(projectId);
    if (!firebaseApp) return res.status(400).json({ error: "Messaging not configured" });

    try {
        let tokens = [];
        if (target.type === 'all') {
            const result = await pool.query('SELECT fcm_token FROM messaging_tokens WHERE project_id = $1', [projectId]);
            tokens = result.rows.map(r => r.fcm_token);
        } else if (target.type === 'user') {
            const result = await pool.query('SELECT fcm_token FROM messaging_tokens WHERE project_id = $1 AND app_user_id = $2', [projectId, target.id]);
            tokens = result.rows.map(r => r.fcm_token);
        }

        if (tokens.length === 0) return res.status(404).json({ error: "No target devices" });

        const messagePayload = {
            data: { suguna_scm: 'true', title: title || '', body: body || '', image: image_url || '', ...data }
        };

        let sent = 0;
        let failed = 0;

        const sendPromises = tokens.map(token =>
            firebaseApp.messaging().send({ ...messagePayload, token })
                .then(() => { sent++; })
                .catch(err => {
                    failed++;
                    console.error(`Failed to send to token ${token}:`, err.message);
                })
        );

        await Promise.all(sendPromises);

        // Record in history with counts
        await pool.query(`
            INSERT INTO notifications_history (project_id, title, body, image_url, data, sent_count, failed_count)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [projectId, title, body, image_url, JSON.stringify(data || {}), sent, failed]);

        res.json({ message: "Notification process complete", summary: { sent, failed } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Analytics Endpoint
app.get('/stats/:projectId', async (req, res) => {
    const { projectId } = req.params;
    try {
        const stats = await pool.query(`
            SELECT 
                COALESCE(SUM(sent_count), 0) as total_sent,
                COALESCE(SUM(failed_count), 0) as total_failed,
                COUNT(*) as total_campaigns
            FROM notifications_history
            WHERE project_id = $1
        `, [projectId]);

        const dailyStats = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                SUM(sent_count) as sent,
                SUM(failed_count) as failed
            FROM notifications_history
            WHERE project_id = $1
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
            LIMIT 30
        `, [projectId]);

        res.json({
            overview: stats.rows[0],
            daily: dailyStats.rows
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/config/reset/:projectId', (req, res) => {
    firebaseApps.delete(req.params.projectId);
    res.json({ success: true });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Suguna Messaging Microservice running on port ${port}`);
});
