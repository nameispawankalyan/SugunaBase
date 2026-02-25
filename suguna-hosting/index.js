const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3600;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'Suguna Hosting' }));

const hostingUpload = multer({ dest: 'hosting_temp/' });
const sitesBaseDir = path.join(__dirname, 'hosted_sites');
if (!fs.existsSync(sitesBaseDir)) fs.mkdirSync(sitesBaseDir, { recursive: true });

const renderHostingError = (code, title, message, subtext) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${code} ${title} | Suguna Hosting</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; font-family: 'Outfit', sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center; }
        .container { max-width: 500px; padding: 2rem; }
        .icon { font-size: 80px; margin-bottom: 1.5rem; animation: pulse 2s infinite; }
        .badge { display: inline-block; background: rgba(99, 102, 241, 0.1); color: #818cf8; padding: 4px 12px; font-weight: bold; font-size: 0.8rem; margin-bottom: 1rem; border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 6px; }
        h1 { font-size: 2.5rem; font-weight: 900; margin: 0; background: linear-gradient(135deg, #a78bfa, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        p { color: #94a3b8; font-size: 1.1rem; margin-top: 1rem; line-height: 1.6; }
        .sub { margin-top: 2rem; color: #475569; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; font-family: monospace; }
        .reason-box { margin-top: 1.5rem; padding: 6px 15px; background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.3); border-radius: 8px; font-family: monospace; font-size: 0.75rem; color: #f87171; display: inline-block; }
        @keyframes pulse { 0% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.8; transform: scale(1); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="badge">HTTP ${code} RESPONSE</div>
        <div class="icon">🕸️</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="reason-box">TECHNICAL REASON: ${subtext}</div>
        <div class="sub">SugunaBase Cloud Edge &bull; Hosting Engine v1</div>
    </div>
</body>
</html>`;

// 1. Deploy Site
app.post('/deploy/:projectId/:siteId', hostingUpload.single('hosting_files'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No zip file provided" });

        const { projectId, siteId } = req.params;
        const siteDir = path.join(sitesBaseDir, projectId, siteId);

        let secureId;
        const siteResult = await pool.query('SELECT secure_id FROM hosting_sites WHERE project_id = $1 AND site_name = $2', [projectId, siteId]);

        if (siteResult.rows.length > 0) {
            secureId = siteResult.rows[0].secure_id;
            await pool.query('UPDATE hosting_sites SET updated_at = CURRENT_TIMESTAMP WHERE project_id = $1 AND site_name = $2', [projectId, siteId]);
        } else {
            secureId = crypto.randomBytes(8).toString('hex');
            await pool.query('INSERT INTO hosting_sites (project_id, site_name, secure_id) VALUES ($1, $2, $3)', [projectId, siteId, secureId]);
        }

        if (fs.existsSync(siteDir)) fs.rmSync(siteDir, { recursive: true, force: true });
        fs.mkdirSync(siteDir, { recursive: true });

        await fs.createReadStream(req.file.path).pipe(unzipper.Extract({ path: siteDir })).promise();
        fs.unlinkSync(req.file.path);

        res.json({ message: "Hosting Deploy Success", secure_id: secureId });
    } catch (e) {
        console.error("Deploy Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. Serve Static Sites
app.use('/serve/:projectId/:siteId/:secureId', async (req, res, next) => {
    const { projectId, siteId, secureId } = req.params;
    try {
        const check = await pool.query(`
            SELECT h.secure_id, h.is_active as site_active, p.is_active as project_active
            FROM hosting_sites h
            JOIN projects p ON h.project_id = p.id
            WHERE p.id = $1 AND h.site_name = $2
        `, [projectId, siteId]);

        if (check.rows.length === 0) return res.status(404).send(renderHostingError(404, 'Site Not Found', 'The requested website does not exist.', 'NOT_FOUND'));
        const { secure_id, site_active, project_active } = check.rows[0];

        if (!project_active) return res.status(403).send(renderHostingError(403, 'Project Restricted', 'This project is disabled.', 'PROJECT_INACTIVE'));
        if (!site_active) return res.status(403).send(renderHostingError(403, 'Site Offline', 'This site is inactive.', 'SITE_INACTIVE'));
        if (secure_id !== secureId) return res.status(403).send(renderHostingError(403, 'Unauthorized', 'Secure ID mismatch.', 'AUTH_FAILED'));

        const sitePath = path.join(sitesBaseDir, projectId, siteId);
        if (!fs.existsSync(sitePath)) return res.status(404).send(renderHostingError(404, 'Missing Assets', 'No files found for this site.', 'FILES_MISSING'));

        express.static(sitePath)(req, res, () => {
            res.status(404).send(renderHostingError(404, 'Page Not Found', 'Resource not found on this site.', '404_INSIDE_SITE'));
        });
    } catch (e) { res.status(500).send('Hosting Engine Error'); }
});

// 3. Management Endpoints
app.get('/sites/:projectId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM hosting_sites WHERE project_id = $1 ORDER BY created_at DESC', [req.params.projectId]);
        res.json({ sites: result.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/sites/:projectId/:siteId/toggle', async (req, res) => {
    try {
        await pool.query('UPDATE hosting_sites SET is_active = $1 WHERE project_id = $2 AND id = $3', [req.body.active, req.params.projectId, req.params.siteId]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/sites/:projectId/:siteId', async (req, res) => {
    try {
        const siteResult = await pool.query('SELECT site_name FROM hosting_sites WHERE project_id = $1 AND id = $2', [req.params.projectId, req.params.siteId]);
        if (siteResult.rows.length > 0) {
            const siteDir = path.join(sitesBaseDir, req.params.projectId, siteResult.rows[0].site_name);
            if (fs.existsSync(siteDir)) fs.rmSync(siteDir, { recursive: true, force: true });
            await pool.query('DELETE FROM hosting_sites WHERE id = $1', [req.params.siteId]);
            res.json({ success: true });
        } else res.status(404).json({ error: "Not found" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, '127.0.0.1', () => {
    console.log(`🕸️ Suguna Hosting Microservice running on port ${port}`);
});
