const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require("socket.io");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'suguna_secret_key';

// Root Route for Identification
app.get('/', (req, res) => {
    res.send('SugunaBase Backend API is Running on Port ' + port);
});

// 1. Setup Socket.io
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ====================================================
// CLOUD FUNCTIONS PROXY (Bypass Nginx Cache Issues)
// ====================================================
const { createProxyMiddleware } = require('http-proxy-middleware');
app.use('/functions', createProxyMiddleware({
    target: 'http://127.0.0.1:3005',
    changeOrigin: true,
    pathRewrite: {
        '^/functions': '', // Strip /functions so 3005 receives /login
    }
}));
// ====================================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access Denied" });

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid Token" });

        // Check if user is still active in DB and get role
        try {
            const check = await pool.query('SELECT role, is_active FROM users WHERE id = $1', [decoded.id]);
            if (check.rows.length === 0 || !check.rows[0].is_active) {
                return res.status(403).json({ error: "Account Deactivated", code: 'ACCOUNT_DISABLED' });
            }
            req.user = { ...decoded, role: check.rows[0].role };
            next();
        } catch (e) {
            return res.status(500).json({ error: "Internal Auth Error" });
        }
    });
};

const authenticateAppToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "App Access Denied" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid App Token" });
        req.app_user = user;
        next();
    });
};

// Middleware to check if a project is active
// Middleware to resolve Project ID (Slug -> Numeric) and check if active
// Middleware to resolve Project ID (Slug -> Numeric) and check if active + Ownership Security
const resolveProject = async (req, res, next) => {
    let projectIdRaw = req.params.projectId || req.params.id || req.headers['x-project-id'];
    if (!projectIdRaw) return next();

    try {
        const isNumeric = /^\d+$/.test(projectIdRaw);
        const query = isNumeric
            ? 'SELECT * FROM projects WHERE id = $1'
            : 'SELECT * FROM projects WHERE project_id = $1';

        const result = await pool.query(query, [projectIdRaw]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Project not found" });
        }

        const project = result.rows[0];

        // 1. Check if project is active
        if (!project.is_active) {
            return res.status(403).json({ error: "This project has been deactivated by the administrator." });
        }

        // 2. SECURITY: Verify Ownership for Console Users
        // If req.user is present (from authenticateToken), they MUST be the owner OR an admin
        if (req.user) {
            if (project.user_id !== req.user.id && req.user.role !== 'admin') {
                console.warn(`🚨 [SECURITY] Unauthorized Project Access Attempt by ${req.user.email} on Project ${project.name}`);
                return res.status(403).json({ error: "Access Denied: You do not have permission to view this project." });
            }
        }

        const actualId = project.id.toString();

        // Inject resolved numeric ID back into params/headers
        if (req.params.projectId) req.params.projectId = actualId;
        if (req.params.id) req.params.id = actualId;
        if (req.headers['x-project-id']) req.headers['x-project-id'] = actualId;

        // Attach project data to request object for convenience
        req.project = project;

        next();
    } catch (e) {
        console.error("Project Resolution Error:", e.message);
        res.status(500).json({ error: "Internal Project Resolution Error" });
    }
};

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) DEFAULT 'developer',
                is_active BOOLEAN DEFAULT TRUE,
                developer_id VARCHAR(100) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Migration for user features
        try {
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT \'developer\';');
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;');
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS developer_id VARCHAR(100) UNIQUE;');

            // Backfill developer_id for existing users
            await pool.query(`UPDATE users SET developer_id = 'dev-' || LOWER(REPLACE(name, ' ', '-')) || '-' || id WHERE developer_id IS NULL;`);

            // CRITICAL: Ensure every user has a role and is active
            await pool.query(`UPDATE users SET role = 'developer' WHERE role IS NULL OR role = '';`);
            await pool.query(`UPDATE users SET is_active = TRUE WHERE is_active IS NULL;`);
        } catch (e) { }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                platform VARCHAR(50), 
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                package_name VARCHAR(255),
                google_sign_in_enabled BOOLEAN DEFAULT FALSE,
                google_client_id VARCHAR(255),
                project_id VARCHAR(100) UNIQUE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Migration for project features
        try {
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS google_sign_in_enabled BOOLEAN DEFAULT FALSE;`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_id VARCHAR(100) UNIQUE;`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`);

            // Backfill project_id for old projects if any
            await pool.query(`UPDATE projects SET project_id = 'project-' || id WHERE project_id IS NULL;`);
        } catch (e) { }

        // Ensure all users have a role and are active
        try {
            await pool.query(`UPDATE users SET role = 'developer' WHERE role IS NULL;`);
            await pool.query(`UPDATE users SET is_active = TRUE WHERE is_active IS NULL;`);
        } catch (e) { }
        try {
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS google_client_id VARCHAR(255);`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS sha1_fingerprint VARCHAR(255);`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS sha256_fingerprint VARCHAR(255);`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS api_secret TEXT;`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS app_id VARCHAR(50) UNIQUE;`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS fcm_service_account JSONB;`);

            // Upgrade credentials for all projects (only if they lack a secure App ID)
            const projects = await pool.query('SELECT id FROM projects WHERE app_id IS NULL');
            for (let row of projects.rows) {
                const appId = require('crypto').randomBytes(16).toString('hex'); // 32 chars
                const apiSecret = require('crypto').randomBytes(16).toString('hex'); // 32 chars
                await pool.query('UPDATE projects SET app_id = $1, api_secret = $2 WHERE id = $3', [appId, apiSecret, row.id]);
            }
            // User Reset Password Fields
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;`);
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;`);
            // Firestore migration
            await pool.query(`ALTER TABLE firestore_data ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
        } catch (e) { console.log("Migration Note:", e.message); }
        // New Table for End Users (App Users)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_users (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                email VARCHAR(255),
                name VARCHAR(255),
                profile_pic TEXT,
                provider VARCHAR(50) DEFAULT 'email', 
                google_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, email) -- Email unique per project
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS firestore_data (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                collection_name VARCHAR(100) NOT NULL,
                document_id VARCHAR(255) NOT NULL,
                data JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, collection_name, document_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS functions_deployments (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                runtime VARCHAR(50) DEFAULT 'nodejs',
                trigger_type VARCHAR(50) DEFAULT 'http',
                trigger_value TEXT,
                region VARCHAR(100) DEFAULT 'asia-south1',
                timeout_seconds INTEGER DEFAULT 60,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, name)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS hosting_sites (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                site_name VARCHAR(100) NOT NULL,
                secure_id VARCHAR(100) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, site_name)
            );
        `);

        // Messaging Tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messaging_tokens (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                app_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
                fcm_token TEXT NOT NULL,
                device_id VARCHAR(255),
                platform VARCHAR(50) DEFAULT 'android',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, app_user_id, fcm_token)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications_history (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                title VARCHAR(255),
                body TEXT,
                image_url TEXT,
                data JSONB DEFAULT '{}',
                status VARCHAR(50) DEFAULT 'sent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Messaging Table Migrations
        try {
            await pool.query('ALTER TABLE notifications_history ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;');
            await pool.query('ALTER TABLE notifications_history ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;');
        } catch (e) { }
        await pool.query(`
            CREATE TABLE IF NOT EXISTS function_logs (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                function_name VARCHAR(255) NOT NULL,
                status VARCHAR(50), 
                logs TEXT,
                execution_time_ms INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Migration to add columns if they don't exist
        try {
            await pool.query('ALTER TABLE functions_deployments ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50) DEFAULT \'http\';');
            await pool.query('ALTER TABLE functions_deployments ADD COLUMN IF NOT EXISTS trigger_value TEXT;');
        } catch (e) { }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS cast_calls (
                id SERIAL PRIMARY KEY,
                room_id VARCHAR(255) NOT NULL,
                app_id VARCHAR(255) NOT NULL,
                type VARCHAR(50) DEFAULT 'video_call',
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                duration INTEGER,
                participants JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS project_usage (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                date DATE DEFAULT CURRENT_DATE,
                firestore_reads INTEGER DEFAULT 0,
                firestore_writes INTEGER DEFAULT 0,
                storage_bytes_used BIGINT DEFAULT 0,
                auth_users_count INTEGER DEFAULT 0,
                cast_minutes INTEGER DEFAULT 0,
                cast_audio_call_mins INTEGER DEFAULT 0,
                cast_video_call_mins INTEGER DEFAULT 0,
                cast_audio_live_mins INTEGER DEFAULT 0,
                cast_video_live_mins INTEGER DEFAULT 0,
                function_executions INTEGER DEFAULT 0,
                UNIQUE(project_id, date)
            );
        `);

        // Migration for new columns
        try {
            await pool.query('ALTER TABLE project_usage ADD COLUMN IF NOT EXISTS cast_minutes INTEGER DEFAULT 0;');
            await pool.query('ALTER TABLE project_usage ADD COLUMN IF NOT EXISTS function_executions INTEGER DEFAULT 0;');
            await pool.query('ALTER TABLE project_usage ADD COLUMN IF NOT EXISTS cast_audio_call_mins INTEGER DEFAULT 0;');
            await pool.query('ALTER TABLE project_usage ADD COLUMN IF NOT EXISTS cast_video_call_mins INTEGER DEFAULT 0;');
            await pool.query('ALTER TABLE project_usage ADD COLUMN IF NOT EXISTS cast_audio_live_mins INTEGER DEFAULT 0;');
            await pool.query('ALTER TABLE project_usage ADD COLUMN IF NOT EXISTS cast_video_live_mins INTEGER DEFAULT 0;');
        } catch (e) { }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id SERIAL PRIMARY KEY,
                project_id VARCHAR(100),
                service_name VARCHAR(50),
                level VARCHAR(20),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ Database Tables Initialized (including SugunaFirestore, Functions, Logs, Cast & Analytics)");
        initSchedules(); // Start the Cron Engine
    } catch (err) {
        console.error("❌ DB Init Error:", err);
    }
};

// --- CRON ENGINE (Scheduled Functions) ---
const activeCronJobs = new Map();

const runScheduledFunction = async (projectId, funcName) => {
    try {
        // Only run if Project is Active
        const projCheck = await pool.query('SELECT is_active FROM projects WHERE id = $1', [projectId]);
        if (projCheck.rows.length === 0 || !projCheck.rows[0].is_active) {
            console.log(`[CRON ENGINE] ⏸️ Skipped ${funcName} (Project ${projectId} is inactive or deleted)`);
            return;
        }

        console.log(`[CRON ENGINE] 🚀 Triggering ${funcName} (Project ${projectId})`);
        await axios.post(`http://localhost:3005/run/${projectId}/${funcName}`, {}, {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error(`[CRON ENGINE] ❌ Execution failed for ${funcName}:`, err.message);
    }
};

const initSchedules = async () => {
    try {
        const res = await pool.query("SELECT * FROM functions_deployments WHERE trigger_type = 'schedule' AND trigger_value IS NOT NULL");
        res.rows.forEach(fn => {
            const jobId = `${fn.project_id}-${fn.name}`;
            if (cron.validate(fn.trigger_value)) {
                const job = cron.schedule(fn.trigger_value, () => runScheduledFunction(fn.project_id, fn.name));
                activeCronJobs.set(jobId, job);
                console.log(`[CRON] Scheduled ${fn.name} (${fn.trigger_value})`);
            }
        });
    } catch (e) { console.error("[CRON] Init Error:", e.message); }
};

const updateFunctionSchedule = async (projectId, funcName, cronString) => {
    const jobId = `${projectId}-${funcName}`;

    // Stop existing job if any
    if (activeCronJobs.has(jobId)) {
        activeCronJobs.get(jobId).stop();
        activeCronJobs.delete(jobId);
    }

    // If new cron provided, start it
    if (cronString && cron.validate(cronString)) {
        const job = cron.schedule(cronString, () => runScheduledFunction(projectId, funcName));
        activeCronJobs.set(jobId, job);
        console.log(`[CRON] Updated schedule for ${funcName}: ${cronString}`);
        return true;
    }
    return false;
};

initDB();

// ====================================================
// AUTH PROXY (suguna-auth: 3300)
// ====================================================
app.post('/v1/auth/signup', (req, res) => {
    axios.post('http://localhost:3300/signup', req.body)
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

app.post('/v1/auth/login', (req, res) => {
    axios.post('http://localhost:3300/login', req.body)
        .then(r => res.json(r.data))
        .catch(e => {
            console.error(`[GATEWAY] Login Proxy Error: ${e.response?.status || 'No Response'} - ${JSON.stringify(e.response?.data || e.message)}`);
            res.status(e.response?.status || 500).json(e.response?.data || { error: e.message });
        });
});

app.post('/v1/auth/forgot-password', (req, res) => {
    axios.post('http://localhost:3300/forgot-password', req.body)
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

app.post('/v1/auth/reset-password', (req, res) => {
    axios.post('http://localhost:3300/reset-password', req.body)
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

app.post('/v1/auth/app-login', (req, res) => {
    axios.post('http://localhost:3300/app-login', req.body)
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

// App User Login / Signup (Google / Email)
// --- SUGUNA CAST TOKEN PROXY ---
app.post('/v1/cast/get-token', async (req, res) => {
    try {
        const { app_id, app_secret, room_id, uid, role, type } = req.body;

        if (!app_id || !app_secret) {
            return res.status(400).json({ error: 'Missing app_id or app_secret' });
        }

        // Forward to Cast Media Server (Port 3100)
        const response = await axios.post('http://127.0.0.1:3100/api/token/generate', {
            appId: app_id,
            appSecret: app_secret,
            roomId: room_id,
            uid: uid,
            role: role || 'broadcaster',
            type: type || 'video_call'
        });

        res.json(response.data);
    } catch (error) {
        console.error('Cast Token Error:', error.message);
        res.status(500).json({ error: 'Failed to reach Cast Server: ' + error.message });
    }
});



// ====================================================
// FIRESTORE PROXY (suguna-firestore: 3400)
// ====================================================
app.all('/v1/firestore/*', authenticateAppToken, resolveProject, (req, res) => {
    const { project_id } = req.app_user;
    const fullPath = req.params[0];

    axios({
        method: req.method,
        url: `http://localhost:3400/data/${fullPath}`,
        data: req.body,
        params: req.query,
        headers: { 'x-project-id': project_id }
    }).then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});
// ====================================================


// ====================================================
// STORAGE PROXY (suguna-storage: 3500)
// ====================================================
// Handle Static Files
app.use('/storage', createProxyMiddleware({
    target: 'http://localhost:3500',
    pathRewrite: { '^/storage': '/files' },
    changeOrigin: true
}));

// Handle App Uploads
app.post('/v1/storage/upload', authenticateAppToken, resolveProject, (req, res, next) => {
    // Inject headers for the storage service to consume
    req.headers['x-project-id'] = req.app_user.project_id;
    req.headers['x-folder-path'] = req.body.folder_path || '';
    req.headers['x-public-host'] = `${req.protocol}://${req.get('host')}`;
    next();
}, createProxyMiddleware({
    target: 'http://localhost:3500',
    pathRewrite: { '^/v1/storage/upload': '/upload' },
    changeOrigin: true
}));

// Handle Console Uploads
app.post('/v1/console/projects/:projectId/storage/upload', authenticateToken, resolveProject, (req, res, next) => {
    req.headers['x-project-id'] = req.params.projectId;
    req.headers['x-folder-path'] = req.body.folder_path || '';
    req.headers['x-public-host'] = `${req.protocol}://${req.get('host')}`;
    next();
}, createProxyMiddleware({
    target: 'http://localhost:3500',
    pathRewrite: { '^/v1/console/projects/[^/]+/storage/upload': '/upload' },
    changeOrigin: true
}));

// Console Storage Management
app.post('/v1/console/projects/:projectId/storage/folder', authenticateToken, resolveProject, (req, res) => {
    axios.post('http://localhost:3500/folder', { projectId: req.params.projectId, ...req.body })
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

app.delete('/v1/console/projects/:projectId/storage', authenticateToken, resolveProject, (req, res) => {
    axios.delete(`http://localhost:3500/delete/${req.params.projectId}`, { data: req.body })
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

app.get('/v1/console/projects/:projectId/storage', authenticateToken, resolveProject, (req, res) => {
    axios.get(`http://localhost:3500/list/${req.params.projectId}`)
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});
// ====================================================

// --- CONSOLE FIRESTORE MANAGEMENT ---

app.get('/v1/console/projects/:projectId/firestore/collections', authenticateToken, resolveProject, async (req, res) => {
    const { projectId } = req.params;
    try {
        const result = await pool.query(
            'SELECT DISTINCT collection_name FROM firestore_data WHERE project_id = $1 ORDER BY collection_name',
            [projectId]
        );
        res.json(result.rows.map(row => row.collection_name));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Unified Console Firestore Handler (Supports Deeply Nested Paths)
app.get('/v1/console/projects/:projectId/firestore/*', authenticateToken, resolveProject, async (req, res) => {
    const { projectId } = req.params;
    const fullPath = req.params[0];
    const segments = fullPath.split('/').filter(s => s.length > 0);

    if (segments.length === 0) return res.status(400).json({ error: "Invalid path" });

    // Scenario 1: Path ends with /documents (e.g., "col1/documents" or "col1/doc1/col2/documents")
    if (segments[segments.length - 1] === 'documents') {
        segments.pop(); // remove 'documents'
        const collection_name = segments.join('/');
        try {
            const result = await pool.query(
                'SELECT document_id FROM firestore_data WHERE project_id = $1 AND collection_name = $2 ORDER BY document_id',
                [projectId, collection_name]
            );
            res.json(result.rows.map(row => row.document_id));
        } catch (e) { res.status(500).json({ error: e.message }); }
    } else {
        // Scenario 2: Specific Document (e.g., "col1/doc1" or "col1/doc1/col2/doc2")
        if (segments.length < 2) return res.status(400).json({ error: "Document path requires at least collection and document ID" });

        const document_id = segments.pop();
        const collection_name = segments.join('/');
        try {
            const result = await pool.query(
                'SELECT data FROM firestore_data WHERE project_id = $1 AND collection_name = $2 AND document_id = $3',
                [projectId, collection_name, document_id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: "Document not found" });
            res.json(result.rows[0].data);
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
});




// --- SUGUNA HOSTING SYSTEM ---

// ====================================================
// HOSTING PROXY (suguna-hosting: 3600)
// ====================================================
// 1. Deploy Site (Proxy with Multipart/form-data support)
app.use('/v1/hosting/deploy/:projectId/:siteId', authenticateToken, createProxyMiddleware({
    target: 'http://localhost:3600',
    pathRewrite: { '^/v1/hosting/deploy': '/deploy' },
    changeOrigin: true
}));

// 2. Serve Sites Dynamically
app.use('/site/:projectId/:siteId/:secureId', (req, res, next) => {
    // We rewrite the URL internally for the hosting service
    const { projectId, siteId, secureId } = req.params;
    req.url = `/serve/${projectId}/${siteId}/${secureId}${req.url.split(secureId)[1] || ''}`;
    next();
}, createProxyMiddleware({
    target: 'http://localhost:3600',
    changeOrigin: true
}));

// 3. Catch invalid/short hosting URLs
app.all(['/site', '/site/*'], (req, res) => {
    res.status(400).send("Invalid Hosting URL structure. Use the full URL from your dashboard.");
});
// ====================================================
// LOGS PROXY (suguna-logs: 3700)
// ====================================================
app.use('/v1/logs', authenticateToken, createProxyMiddleware({
    target: 'http://localhost:3700',
    pathRewrite: { '^/v1/logs': '/' },
    changeOrigin: true
}));

// Internal Log Helper
const logToSystem = (projectId, service, level, message) => {
    axios.post('http://localhost:3700/ingest', { projectId, service, level, message })
        .catch(e => console.error("Log Ingestion Failed:", e.message));
};

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'Suguna Gateway' }));

app.get('/v1/cluster-health', async (req, res) => {
    const services = [
        { id: 'gateway', name: 'Gateway', port: 5000 },
        { id: 'auth', name: 'Auth', port: 3300 },
        { id: 'firestore', name: 'Firestore', port: 3400 },
        { id: 'messaging', name: 'Messaging', port: 3200 },
        { id: 'storage', name: 'Storage', port: 3500 },
        { id: 'hosting', name: 'Hosting', port: 3600 },
        { id: 'logs', name: 'Logs', port: 3700 },
        { id: 'functions', name: 'Functions', port: 3005 },
        { id: 'cast', name: 'Cast', port: 3100 }
    ];

    const results = {};
    const checks = services.map(async (s) => {
        try {
            const start = Date.now();
            const response = await axios.get(`http://localhost:${s.port}/health`, { timeout: 2000 });
            results[s.id] = { status: 'UP', latency: Date.now() - start, ...response.data };
        } catch (e) {
            results[s.id] = { status: 'DOWN', error: e.message };
        }
    });

    await Promise.all(checks);
    res.json(results);
});

app.get('/v1/health', (req, res) => res.json({ status: 'OK', msg: 'SugunaBase Live!' }));

// Check Project Status for App (Public Route)
app.get('/v1/app/check-project/:id', resolveProject, async (req, res) => {
    const projectId = req.params.id;
    console.log(`🔍[App] Checking status for Project ID: ${projectId} `);
    try {
        const result = await pool.query('SELECT google_sign_in_enabled FROM projects WHERE id = $1', [projectId]);
        if (result.rows.length === 0) {
            console.log(`❌ Project ${projectId} not found`);
            return res.json({ exists: false, active: false });
        }
        const active = result.rows[0].google_sign_in_enabled;
        console.log(`✅ Project ${projectId} found. Active: ${active} `);
        res.json({ exists: true, active: active });
    } catch (e) {
        console.error(`🔥 Error checking project ${projectId}: `, e.message);
        res.status(500).json({ error: e.message });
    }
});

// Internal Route to get Project Activity Status for Cloud Functions Hub
app.get('/v1/internal/projects/:projectId/status', resolveProject, async (req, res) => {
    try {
        const result = await pool.query('SELECT is_active FROM projects WHERE id = $1', [req.params.projectId]);
        if (result.rows.length === 0) {
            return res.json({ exists: false, active: false });
        }
        return res.json({ exists: true, active: result.rows[0].is_active });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- PROTECTED ROUTES (Require Login) ---

// Get Hosting Sites for a Project
app.get('/v1/console/projects/:projectId/hosting/sites', authenticateToken, resolveProject, (req, res) => {
    axios.get(`http://localhost:3600/sites/${req.params.projectId}`)
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

// Toggle Hosting Site Status (Active/Inactive)
app.post('/v1/console/projects/:projectId/hosting/sites/:siteId/toggle', authenticateToken, resolveProject, (req, res) => {
    axios.post(`http://localhost:3600/sites/${req.params.projectId}/${req.params.siteId}/toggle`, req.body)
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

// Delete Hosting Site
app.delete('/v1/console/projects/:projectId/hosting/sites/:siteId', authenticateToken, resolveProject, (req, res) => {
    axios.delete(`http://localhost:3600/sites/${req.params.projectId}/${req.params.siteId}`)
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

// --- USER PROFILE ENDPOINT ---
app.get('/v1/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, is_active, developer_id, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get User's Projects
app.get('/v1/projects', authenticateToken, async (req, res) => { /* ... */
    try {
        const result = await pool.query(
            'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id] // user.id from Token
        );
        res.json({ projects: result.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create Project
app.post('/v1/projects', authenticateToken, async (req, res) => {
    const { name, platform, google_client_id } = req.body;
    try {
        const userId = req.user.id;

        // Generate Firebase-like project ID
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const projectIdForApp = `${slug}-${randomSuffix}`;

        const result = await pool.query(
            'INSERT INTO projects (name, platform, user_id, google_sign_in_enabled, google_client_id, app_id, api_secret, project_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [name, platform || 'Android', userId, !!google_client_id, google_client_id, require('crypto').randomBytes(16).toString('hex'), require('crypto').randomBytes(16).toString('hex'), projectIdForApp]
        );

        io.to(req.user.id.toString()).emit("project_created", result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/v1/projects/:id', authenticateToken, resolveProject, (req, res) => {
    res.json(req.project);
});

// GET USERS FOR A PROJECT (Console View)
app.get('/v1/projects/:id/users', authenticateToken, resolveProject, async (req, res) => {
    try {
        // 1. Verify Project Ownership/Admin (handled by resolveProject middleware)
        // 2. Fetch Users
        const users = await pool.query(
            'SELECT * FROM app_users WHERE project_id = $1 ORDER BY created_at DESC',
            [req.project.id]
        );
        res.json({ users: users.rows });

    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/v1/projects/:id/apps', authenticateToken, resolveProject, async (req, res) => {
    const { package_name } = req.body;
    try {
        const result = await pool.query(
            'UPDATE projects SET package_name = $1 WHERE id = $2 RETURNING *',
            [package_name, req.project.id]
        );
        io.to(req.user.id.toString()).emit("project_updated", result.rows[0]);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update Project SHA Keys
app.put('/v1/projects/:id/sha', authenticateToken, resolveProject, async (req, res) => {
    const { sha1, sha256 } = req.body;
    try {
        const result = await pool.query(
            'UPDATE projects SET sha1_fingerprint = $1, sha256_fingerprint = $2 WHERE id = $3 RETURNING *',
            [sha1, sha256, req.project.id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update Project Name and Google Client ID
app.put('/v1/projects/:id', authenticateToken, resolveProject, async (req, res) => {
    const { name, google_client_id } = req.body;
    try {
        const result = await pool.query(
            'UPDATE projects SET name = $1, google_client_id = $2 WHERE id = $3 RETURNING *',
            [name, google_client_id, req.project.id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete Project
app.delete('/v1/projects/:id', authenticateToken, resolveProject, async (req, res) => {
    try {
        await pool.query('DELETE FROM projects WHERE id = $1', [req.project.id]);
        res.json({ success: true, message: "Project deleted successfully" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Download Config JSON (Suguna Services) - Endpoint to generate the file
app.get('/v1/projects/:id/config', authenticateToken, resolveProject, async (req, res) => {
    try {
        const project = req.project;

        // Construct the JSON structure similar to google-services.json but for SugunaBase
        const config = {
            "project_info": {
                "project_id": project.project_id || project.id,
                "project_name": project.name,
                "package_name": project.package_name
            },
            "client": {
                "oauth_client": {
                    "client_id": project.google_client_id
                },
                "api_key": {
                    "current_key": "TODO_IF_NEEDED"
                },
                "services": {
                    "sugunabase": {
                        "base_url": "http://api.suguna.co/" // Use designated API hostname
                    }
                },
                "app_integrity": {
                    "sha1_fingerprint": project.sha1_fingerprint,
                    "sha256_fingerprint": project.sha256_fingerprint
                }
            }
        };

        // If requested to download as file
        if (req.query.download === 'true') {
            res.header('Content-Disposition', 'attachment; filename="suguna-services.json"');
        }

        res.json(config);

    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/v1/projects/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM projects WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Project not found" });

        io.to(req.user.id.toString()).emit("project_deleted", req.params.id);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ANALYTICS DASHBOARD API ---
app.get('/v1/console/projects/:projectId/analytics', authenticateToken, resolveProject, async (req, res) => {
    const { projectId } = req.params;
    const { range, startDate, endDate } = req.query;

    let startDateSql = "CURRENT_DATE - INTERVAL '7 days'";
    let endDateSql = "CURRENT_DATE";

    if (range) {
        switch (range) {
            case 'today':
                startDateSql = "CURRENT_DATE";
                break;
            case 'yesterday':
                startDateSql = "CURRENT_DATE - INTERVAL '1 day'";
                endDateSql = "CURRENT_DATE - INTERVAL '1 day'";
                break;
            case '30d':
                startDateSql = "CURRENT_DATE - INTERVAL '30 days'";
                break;
            case '90d':
                startDateSql = "CURRENT_DATE - INTERVAL '90 days'";
                break;
            case 'current_month':
                startDateSql = "DATE_TRUNC('month', CURRENT_DATE)";
                break;
            case 'last_month':
                startDateSql = "DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')";
                endDateSql = "DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day'";
                break;
            case 'custom':
                if (startDate && endDate) {
                    startDateSql = `'${startDate}'::date`;
                    endDateSql = `'${endDate}'::date`;
                }
                break;
        }
    }

    try {
        // 1. Get User Stats (Filtered by range)
        const userStats = await pool.query(`
            SELECT COUNT(*) as total FROM app_users 
            WHERE project_id = $1 AND created_at::date >= ${startDateSql} AND created_at::date <= ${endDateSql}
        `, [projectId]);

        // 2. Get User Trend (Last 7 days vs previous 7 days)
        const userTrend = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as this_week,
                COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '14 days' AND created_at <= CURRENT_DATE - INTERVAL '7 days') as last_week
            FROM app_users WHERE project_id = $1
        `, [projectId]);

        // 3. Get Storage Stats (Filtered by range)
        const storageStats = await pool.query(`
            SELECT SUM(file_size) as total_size, COUNT(*) as file_count FROM storage_files 
            WHERE project_id = $1 AND created_at::date >= ${startDateSql} AND created_at::date <= ${endDateSql}
        `, [projectId]);

        // 4. Get Firestore Stats (With Gap Filling)
        const usageHistory = await pool.query(`
            SELECT 
                series_date::date as date, 
                COALESCE(p.firestore_reads, 0) as firestore_reads, 
                COALESCE(p.firestore_writes, 0) as firestore_writes,
                COALESCE(p.cast_minutes, 0) as cast_minutes,
                COALESCE(p.cast_audio_call_mins, 0) as cast_audio_call_mins,
                COALESCE(p.cast_video_call_mins, 0) as cast_video_call_mins,
                COALESCE(p.cast_audio_live_mins, 0) as cast_audio_live_mins,
                COALESCE(p.cast_video_live_mins, 0) as cast_video_live_mins,
                COALESCE(p.function_executions, 0) as function_executions
            FROM GENERATE_SERIES(${startDateSql}, ${endDateSql}, '1 day'::interval) as series_date
            LEFT JOIN project_usage p ON p.date = series_date::date AND p.project_id = $1
            ORDER BY series_date ASC
        `, [projectId]);

        const thisWeek = parseInt(userTrend.rows[0].this_week || 0);
        const lastWeek = parseInt(userTrend.rows[0].last_week || 0);
        let trendPct = 0;
        if (lastWeek > 0) {
            trendPct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
        } else if (thisWeek > 0) {
            trendPct = 100;
        }

        // Aggregate totals for the range
        const totals = {
            firestore: usageHistory.rows.reduce((acc, row) => acc + parseInt(row.firestore_reads) + parseInt(row.firestore_writes), 0),
            cast: usageHistory.rows.reduce((acc, row) => acc + parseInt(row.cast_minutes), 0),
            cast_audio_call: usageHistory.rows.reduce((acc, row) => acc + parseInt(row.cast_audio_call_mins), 0),
            cast_video_call: usageHistory.rows.reduce((acc, row) => acc + parseInt(row.cast_video_call_mins), 0),
            cast_audio_live: usageHistory.rows.reduce((acc, row) => acc + parseInt(row.cast_audio_live_mins), 0),
            cast_video_live: usageHistory.rows.reduce((acc, row) => acc + parseInt(row.cast_video_live_mins), 0),
            functions: usageHistory.rows.reduce((acc, row) => acc + parseInt(row.function_executions), 0)
        };

        res.json({
            auth: {
                total_users: parseInt(userStats.rows[0].total),
                trend: trendPct >= 0 ? `+${trendPct}% from last week` : `${trendPct}% from last week`
            },
            storage: {
                total_bytes: parseInt(storageStats.rows[0].total_size || 0),
                total_files: parseInt(storageStats.rows[0].file_count)
            },
            firestore: {
                total: totals.firestore,
                history: usageHistory.rows
            },
            cast: {
                total: totals.cast,
                audio_call: totals.cast_audio_call,
                video_call: totals.cast_video_call,
                audio_live: totals.cast_audio_live,
                video_live: totals.cast_video_live
            },
            functions: {
                total: totals.functions
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Socket.io Connection Logic (Enhanced for Rooms)
io.on('connection', (socket) => {
    console.log('🔌 [Socket] Client connected:', socket.id);

    // Subscribe to a specific collection (Dynamic Real-time)
    socket.on('subscribe_collection', ({ project_id, collection }) => {
        const room = `project_${project_id}_${collection} `;
        socket.join(room);
        console.log(`📡[Socket] Client ${socket.id} subscribed to ${room} `);
    });

    // Unsubscribe
    socket.on('unsubscribe_collection', ({ project_id, collection }) => {
        const room = `project_${project_id}_${collection} `;
        socket.leave(room);
        console.log(`📡[Socket] Client ${socket.id} unsubscribed from ${room} `);
    });

    socket.on('disconnect', () => {
        console.log('🔌 [Socket] Client disconnected');
    });
});

// --- FUNCTIONS MANAGEMENT ROUTES ---

// Fetch Functions (Firebase Style Table Data)
app.get('/v1/console/projects/:projectId/functions', authenticateToken, resolveProject, async (req, res) => {
    const projectId = req.params.projectId;
    try {
        const result = await pool.query(
            `SELECT f.*, 
            (SELECT COUNT(*) FROM function_logs l WHERE l.project_id = f.project_id AND l.function_name = f.name) as request_count 
            FROM functions_deployments f 
            WHERE f.project_id = $1 ORDER BY f.created_at DESC`,
            [projectId]
        );
        res.json({ functions: result.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Fetch Logs for a specific function
app.get('/v1/console/projects/:projectId/functions/:name/logs', authenticateToken, resolveProject, async (req, res) => {
    const { projectId, name } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM function_logs WHERE project_id = $1 AND function_name = $2 ORDER BY created_at DESC LIMIT 50',
            [projectId, name]
        );
        res.json({ logs: result.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/v1/console/projects/:projectId/functions/:name', authenticateToken, resolveProject, async (req, res) => {
    const { projectId, name } = req.params;
    try {
        await pool.query('DELETE FROM functions_deployments WHERE project_id = $1 AND name = $2', [projectId, name]);
        await pool.query('DELETE FROM function_logs WHERE project_id = $1 AND function_name = $2', [projectId, name]);

        const axios = require('axios');
        try { await axios.delete(`http://localhost:3005/internal/delete/${projectId}/${name}`); } catch (err) { }

        res.json({ success: true, message: "Function deleted successfully" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Internal Route: Register Function
app.post('/v1/internal/functions/register', async (req, res) => {
    const { projectId, name, runtime, triggerType, triggerValue, region, timeout } = req.body;
    try {
        await pool.query(`
            INSERT INTO functions_deployments (project_id, name, runtime, trigger_type, trigger_value, region, timeout_seconds, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (project_id, name) DO UPDATE 
            SET trigger_type = EXCLUDED.trigger_type, 
                trigger_value = EXCLUDED.trigger_value,
                region = COALESCE(EXCLUDED.region, functions_deployments.region),
                timeout_seconds = COALESCE(EXCLUDED.timeout_seconds, functions_deployments.timeout_seconds),
                updated_at = NOW(), 
                status = 'active'
        `, [projectId, name, runtime || 'nodejs', triggerType || 'http', triggerValue, region || 'asia-south1', timeout || 60]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Internal Route: Save Execution Logs
app.post('/v1/internal/functions/logs', async (req, res) => {
    const { projectId, name, status, logs, duration } = req.body;
    try {
        await pool.query(`
            INSERT INTO function_logs (project_id, function_name, status, logs, execution_time_ms)
            VALUES ($1, $2, $3, $4, $5)
        `, [projectId, name, status, logs, duration]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update Function Schedule (Cron)
// ====================================================
// CLOUD MESSAGING PROXY (Standalone Microservice)
// ====================================================
app.use('/v1/messaging/register', authenticateAppToken, resolveProject, (req, res) => {
    const { fcm_token, device_id, platform } = req.body;
    const { app_user_id, project_id } = req.app_user;

    axios.post('http://localhost:3200/register', {
        project_id, app_user_id, fcm_token, device_id, platform
    }).then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

app.put('/v1/console/projects/:projectId/messaging/config', authenticateToken, resolveProject, async (req, res) => {
    const { projectId } = req.params;
    const { serviceAccount } = req.body;
    try {
        await pool.query('UPDATE projects SET fcm_service_account = $1 WHERE id = $2', [JSON.stringify(serviceAccount), projectId]);
        await axios.post(`http://localhost:3200/config/reset/${projectId}`).catch(() => { });
        res.json({ message: "Messaging configuration updated" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/v1/console/projects/:projectId/messaging/send', authenticateToken, resolveProject, (req, res) => {
    const { projectId } = req.params;
    axios.post(`http://localhost:3200/send/${projectId}`, req.body)
        .then(r => res.json(r.data))
        .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: e.message }));
});

app.get('/v1/console/projects/:projectId/messaging/history', authenticateToken, resolveProject, async (req, res) => {
    const { projectId } = req.params;
    try {
        const history = await pool.query('SELECT * FROM notifications_history WHERE project_id = $1 ORDER BY created_at DESC LIMIT 50', [projectId]);
        const stats = await pool.query('SELECT COUNT(*) as total_devices FROM messaging_tokens WHERE project_id = $1', [projectId]);
        res.json({ history: history.rows, total_devices: parseInt(stats.rows[0].total_devices) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// ====================================================

app.post('/v1/console/projects/:projectId/functions/:name/schedule', authenticateToken, resolveProject, async (req, res) => {
    const { projectId, name } = req.params;
    const { cronString } = req.body;

    try {
        if (!cron.validate(cronString)) {
            return res.status(400).json({ error: "Invalid Cron Expression" });
        }

        await pool.query(
            "UPDATE functions_deployments SET trigger_type = 'schedule', trigger_value = $1, updated_at = NOW() WHERE project_id = $2 AND name = $3",
            [cronString, projectId, name]
        );

        await updateFunctionSchedule(projectId, name, cronString);
        res.json({ success: true, message: "Schedule updated successfully" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access Denied" });

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid Token" });

        try {
            // Fetch latest user data from DB to verify Admin role
            const result = await pool.query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [decoded.id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            const user = result.rows[0];

            if (!user.is_active) {
                return res.status(403).json({ error: "Account Deactivated", code: 'ACCOUNT_DISABLED' });
            }

            if (user.role !== 'admin') {
                return res.status(403).json({ error: "Forbidden: Admin access only" });
            }

            req.user = user;
            next();
        } catch (e) {
            console.error("[ADMIN AUTH ERROR]", e);
            res.status(500).json({ error: "Internal Server Auth Error" });
        }
    });
};

// --- ADMIN API ---

// List all developers with project counts
app.get('/v1/admin/users', authenticateAdmin, async (req, res) => {
    try {
        console.log(`[ADMIN] Fetching user list requested by ${req.user.email}`);

        // Count total users for debugging
        const totalCount = await pool.query('SELECT COUNT(*) FROM users');
        console.log(`[ADMIN] Total users in DB: ${totalCount.rows[0].count}`);

        const result = await pool.query(`
            SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at, u.developer_id,
            (SELECT COUNT(*) FROM projects WHERE user_id = u.id) as project_count
            FROM users u
            WHERE LOWER(role) != 'admin' OR role IS NULL
            ORDER BY u.created_at DESC
        `);
        console.log(`[ADMIN] Found ${result.rows.length} non-admin users.`);
        res.json(result.rows);
    } catch (e) {
        console.error(`[ADMIN] User List Error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

// Toggle user status
app.put('/v1/admin/users/:id/status', authenticateAdmin, async (req, res) => {
    const { is_active } = req.body;
    try {
        await pool.query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// List projects for a specific user
app.get('/v1/admin/users/:id/projects', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', [req.params.id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Toggle project status
app.put('/v1/admin/projects/:id/status', authenticateAdmin, async (req, res) => {
    const { is_active } = req.body;
    try {
        await pool.query('UPDATE projects SET is_active = $1 WHERE id = $2', [is_active, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- END ADMIN API ---

server.listen(port, () => console.log(`🚀 SugunaBase Server running on port ${port} `));
