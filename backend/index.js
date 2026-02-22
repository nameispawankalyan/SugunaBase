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

const uploadDir = path.join(__dirname, 'storage_uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/storage', express.static(uploadDir));

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

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Token" });
        req.user = user;
        next();
    });
};

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                platform VARCHAR(50), 
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                package_name VARCHAR(255),
                google_sign_in_enabled BOOLEAN DEFAULT FALSE,
                google_client_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Add columns if they don't exist (Migration for existing DBs)
        try {
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS google_sign_in_enabled BOOLEAN DEFAULT FALSE;`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS google_client_id VARCHAR(255);`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS sha1_fingerprint VARCHAR(255);`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS sha256_fingerprint VARCHAR(255);`);
            await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`);
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, site_name)
            );
        `);
        // Migration: Add columns if they don't exist
        try {
            await pool.query("ALTER TABLE functions_deployments ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT 'asia-south1';");
            await pool.query("ALTER TABLE functions_deployments ADD COLUMN IF NOT EXISTS timeout_seconds INTEGER DEFAULT 60;");
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

        console.log("✅ Database Tables Initialized (including SugunaFirestore, Functions & Logs)");
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

// --- AUTH ROUTES FOR CONSOLE (Developers) ---
app.post('/v1/auth/signup', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
            [email, hashedPassword, name]
        );
        const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ user: result.rows[0], token });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/v1/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/v1/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.json({ message: 'If email exists, reset link sent.' }); // Security: Don't reveal existence

        const user = result.rows[0];
        // Generate a random token (secure enough for now)
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 Hour

        await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [resetToken, expiry, user.id]);

        // SIMULATE EMAIL SENDING
        const resetLink = `https://suguna.co/reset-password?token=${resetToken}`;
        console.log(`\nPassword Reset Requested for ${email}:\nLink: ${resetLink}\n`);

        res.json({ message: 'If email exists, reset link sent.', debug_token: resetToken }); // Including token for testing, remove in prod!
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/v1/auth/reset-password', async (req, res) => {
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


// --- AUTH ROUTES FOR APPS (End Users) ---

// App User Login / Signup (Google / Email)
app.post('/v1/auth/app-login', async (req, res) => {
    const { project_id, email, name, photo_url, google_id, provider } = req.body;

    // In real world: Verify 'project_id' exists and 'google_id_token' is valid.

    try {
        // Check if user exists in this project
        const check = await pool.query(
            'SELECT * FROM app_users WHERE project_id = $1 AND email = $2',
            [project_id, email]
        );

        // Check if Google Sign-In is enabled for this project
        if (provider === 'google') {
            const projectResult = await pool.query('SELECT google_sign_in_enabled FROM projects WHERE id = $1', [project_id]);
            if (projectResult.rows.length === 0) return res.status(404).json({ error: "Project not found" });
            if (!projectResult.rows[0].google_sign_in_enabled) {
                return res.status(403).json({ error: "Google Sign-In is disabled for this project" });
            }
        }

        let user;
        if (check.rows.length > 0) {
            // Login: Update last_login
            user = check.rows[0];
            await pool.query('UPDATE app_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        } else {
            // Signup: Create new user
            const insert = await pool.query(
                `INSERT INTO app_users (project_id, email, name, profile_pic, provider, google_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [project_id, email, name, photo_url, provider || 'email', google_id]
            );
            user = insert.rows[0];
        }

        // Generate App User Token (Different from Developer Token)
        const token = jwt.sign({ app_user_id: user.id, project_id: project_id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ user, token });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- SUGUNA FIRESTORE API (Generic Document Store) ---

// App User Middleware (Verify App Token)
const authenticateAppToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "No Token Provided" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid App Token" });
        req.app_user = decoded; // Contains app_user_id and project_id
        next();
    });
};

// Unified Firestore Handler (Supports Deeply Nested Paths & Dynamic Filtering)
app.get('/v1/firestore/*', authenticateAppToken, async (req, res) => {
    const fullPath = req.params[0];
    const segments = fullPath.split('/').filter(s => s.length > 0);
    const { project_id } = req.app_user;

    if (segments.length === 0) return res.status(400).json({ error: "Invalid path" });

    if (segments.length % 2 === 0) {
        // --- Document Request ---
        const document_id = segments.pop();
        const collection_name = segments.join('/');
        try {
            const result = await pool.query(
                'SELECT data FROM firestore_data WHERE project_id = $1 AND collection_name = $2 AND document_id = $3',
                [project_id, collection_name, document_id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: "Document not found" });
            res.json(result.rows[0].data);
        } catch (e) { res.status(500).json({ error: e.message }); }
    } else {
        // --- Collection Request (With Dynamic Filtering) ---
        const collection_name = segments.join('/');
        let queryText = 'SELECT document_id, data FROM firestore_data WHERE project_id = $1 AND collection_name = $2';
        const queryParams = [project_id, collection_name];

        // Dynamic Filtering: ?language=Telugu&age=25
        const filters = Object.keys(req.query);
        filters.forEach((key, index) => {
            queryText += ` AND data->>'${key}' = $${index + 3}`;
            queryParams.push(req.query[key]);
        });

        queryText += ' ORDER BY created_at DESC';

        try {
            const result = await pool.query(queryText, queryParams);
            res.json(result.rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
});

app.post('/v1/firestore/*', authenticateAppToken, async (req, res) => {
    const fullPath = req.params[0];
    const segments = fullPath.split('/').filter(s => s.length > 0);
    const { project_id } = req.app_user;
    const data = req.body;

    if (segments.length % 2 !== 0) return res.status(400).json({ error: "POST requires a full document path" });

    const document_id = segments.pop();
    const collection_name = segments.join('/');

    try {
        await pool.query(
            `INSERT INTO firestore_data (project_id, collection_name, document_id, data) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (project_id, collection_name, document_id) 
             DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
            [project_id, collection_name, document_id, JSON.stringify(data)]
        );

        // Notify Subscribers (Real-time Room)
        io.to(`project_${project_id}_${collection_name}`).emit('firestore_update', {
            type: 'set',
            collection: collection_name,
            document_id: document_id,
            data: data
        });

        res.json({ message: "Document Saved", collection_name, document_id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/v1/firestore/*', authenticateAppToken, async (req, res) => {
    const fullPath = req.params[0];
    const segments = fullPath.split('/').filter(s => s.length > 0);
    const { project_id } = req.app_user;
    const newData = req.body;

    if (segments.length % 2 !== 0) return res.status(400).json({ error: "PATCH requires a full document path" });

    const document_id = segments.pop();
    const collection_name = segments.join('/');

    try {
        const current = await pool.query(
            'SELECT data FROM firestore_data WHERE project_id = $1 AND collection_name = $2 AND document_id = $3',
            [project_id, collection_name, document_id]
        );

        let finalData = newData;
        if (current.rows.length > 0) {
            finalData = { ...current.rows[0].data, ...newData };
        }

        await pool.query(
            `INSERT INTO firestore_data (project_id, collection_name, document_id, data) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (project_id, collection_name, document_id) 
             DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
            [project_id, collection_name, document_id, JSON.stringify(finalData)]
        );

        // Notify Subscribers (Real-time Room)
        io.to(`project_${project_id}_${collection_name}`).emit('firestore_update', {
            type: 'update',
            collection: collection_name,
            document_id: document_id,
            data: finalData
        });

        res.json({ message: "Document Merged", collection_name, document_id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/v1/firestore/*', authenticateAppToken, async (req, res) => {
    const fullPath = req.params[0];
    const segments = fullPath.split('/').filter(s => s.length > 0);
    const { project_id } = req.app_user;

    if (segments.length === 0) return res.status(400).json({ error: "Invalid path" });

    try {
        if (segments.length % 2 === 0) {
            // --- Step 1: Delete Specific Document ---
            const document_id = segments.pop();
            const collection_name = segments.join('/');

            await pool.query(
                'DELETE FROM firestore_data WHERE project_id = $1 AND collection_name = $2 AND document_id = $3',
                [project_id, collection_name, document_id]
            );

            io.to(`project_${project_id}_${collection_name}`).emit('firestore_update', {
                type: 'delete_document',
                collection: collection_name,
                document_id: document_id
            });

            res.json({ message: "Document Deleted", collection_name, document_id });
        } else {
            // --- Step 2: Delete Entire Collection ---
            const collection_name = segments.join('/');

            await pool.query(
                'DELETE FROM firestore_data WHERE project_id = $1 AND collection_name = $2',
                [project_id, collection_name]
            );

            io.to(`project_${project_id}_${collection_name}`).emit('firestore_update', {
                type: 'delete_collection',
                collection: collection_name
            });

            res.json({ message: "Entire Collection Deleted", collection_name });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SUGUNA STORAGE API (File Uploads) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folderPath = req.body.folder_path || '';
        const projId = req.params.projectId || (req.app_user ? req.app_user.project_id : 'shared');
        const projectDir = path.join(uploadDir, String(projId), folderPath);
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }
        cb(null, projectDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

app.post('/v1/storage/upload', authenticateAppToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const { project_id } = req.app_user;
        const folder_path = req.body.folder_path || '';
        const file_name = req.file.filename;
        const file_type = req.file.mimetype;
        const file_size = req.file.size;

        const token = require('crypto').randomUUID(); // generate a token format like Firebase
        const fileUrl = `${req.protocol}://${req.get('host')}/storage/${project_id}/${folder_path ? folder_path + '/' : ''}${file_name}?alt=media&token=${token}`;

        const result = await pool.query(
            `INSERT INTO storage_files (project_id, folder_path, file_name, file_url, file_type, file_size) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [project_id, folder_path, file_name, fileUrl, file_type, file_size]
        );

        res.json({ message: "File Uploaded Successfully", data: result.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/v1/console/projects/:projectId/storage/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const { projectId } = req.params;
        const folder_path = req.body.folder_path || '';
        const file_name = req.file.filename;
        const file_type = req.file.mimetype;
        const file_size = req.file.size;

        const fileUrl = `${req.protocol}://${req.get('host')}/storage/${projectId}/${folder_path ? folder_path + '/' : ''}${file_name}`;

        const result = await pool.query(
            `INSERT INTO storage_files (project_id, folder_path, file_name, file_url, file_type, file_size) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [projectId, folder_path, file_name, fileUrl, file_type, file_size]
        );

        res.json({ message: "File Uploaded Successfully", data: result.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/v1/console/projects/:projectId/storage/folder', authenticateToken, async (req, res) => {
    const { projectId } = req.params;
    const { folder_path } = req.body;
    try {
        // Just insert a dummy record specifying this folder exists so the UI catches it
        const result = await pool.query(
            `INSERT INTO storage_files (project_id, folder_path, file_name, file_url, file_type, file_size) 
             VALUES ($1, $2, '', '', 'Folder', 0) RETURNING *`,
            [projectId, folder_path]
        );
        res.json({ message: "Folder Created Successfully", data: result.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/v1/console/projects/:projectId/storage', authenticateToken, async (req, res) => {
    const { projectId } = req.params;
    const { ids, folderPaths } = req.body;

    // allow either ids or folderPaths
    if ((!ids || ids.length === 0) && (!folderPaths || folderPaths.length === 0)) {
        return res.status(400).json({ error: "No storage items provided to delete" });
    }

    try {
        let deletedCount = 0;

        if (ids && ids.length > 0) {
            const query = `DELETE FROM storage_files WHERE project_id = $1 AND id = ANY($2::int[]) RETURNING *`;
            const result = await pool.query(query, [projectId, ids]);
            deletedCount += result.rowCount;
        }

        if (folderPaths && folderPaths.length > 0) {
            for (let folderPath of folderPaths) {
                // Delete the folder itself, or any file inside it
                const query = `DELETE FROM storage_files WHERE project_id = $1 AND (folder_path = $2 OR folder_path LIKE $3)`;
                const result = await pool.query(query, [projectId, folderPath, `${folderPath}/%`]);
                deletedCount += result.rowCount;
            }
        }

        res.json({ message: "Deleted successfully", count: deletedCount });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/v1/console/projects/:projectId/storage', authenticateToken, async (req, res) => {
    const { projectId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM storage_files WHERE project_id = $1 ORDER BY created_at DESC',
            [projectId]
        );
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CONSOLE FIRESTORE MANAGEMENT ---

app.get('/v1/console/projects/:projectId/firestore/collections', authenticateToken, async (req, res) => {
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
app.get('/v1/console/projects/:projectId/firestore/*', authenticateToken, async (req, res) => {
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
const unzipper = require('unzipper');
const crypto = require('crypto');

const hostingUpload = multer({ dest: 'hosting_temp/' });

app.post('/v1/hosting/deploy/:projectId/:siteId', authenticateToken, hostingUpload.single('hosting_files'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No zip file provided" });

        const { projectId, siteId } = req.params;
        const siteDir = path.join(__dirname, 'hosting_sites', projectId, siteId);

        // Get or Create Secure URL ID
        let secureId;
        const siteResult = await pool.query('SELECT secure_id FROM hosting_sites WHERE project_id = $1 AND site_name = $2', [projectId, siteId]);

        if (siteResult.rows.length > 0) {
            secureId = siteResult.rows[0].secure_id;
        } else {
            secureId = crypto.randomBytes(8).toString('hex'); // Generate 16char secure ID
            await pool.query('INSERT INTO hosting_sites (project_id, site_name, secure_id) VALUES ($1, $2, $3)', [projectId, siteId, secureId]);
        }

        // 1. Create clean directory
        if (fs.existsSync(siteDir)) {
            fs.rmSync(siteDir, { recursive: true, force: true });
        }
        fs.mkdirSync(siteDir, { recursive: true });

        // 2. Extract ZIP
        await fs.createReadStream(req.file.path)
            .pipe(unzipper.Extract({ path: siteDir }))
            .promise();

        // 3. Delete temporary zip
        fs.unlinkSync(req.file.path);

        const liveUrl = `https://api.suguna.co/site/${projectId}/${siteId}/${secureId}`;

        res.json({ message: "Hosting Deploy Success", live_url: liveUrl });
    } catch (e) {
        console.error("Hosting Deploy Error:", e);
        res.status(500).json({ error: "Hosting deployment failed" });
    }
});

// Serve Hosted Sites dynamically
app.use('/site/:projectId/:siteId/:secureId', async (req, res, next) => {
    const { projectId, siteId, secureId } = req.params;

    try {
        const siteCheck = await pool.query('SELECT secure_id FROM hosting_sites WHERE project_id = $1 AND site_name = $2', [projectId, siteId]);
        if (siteCheck.rows.length === 0 || siteCheck.rows[0].secure_id !== secureId) {
            return res.status(403).send('<h1>Suguna Hosting: Access Denied</h1><p>Invalid secure link or site not found.</p>');
        }

        const sitePath = path.join(__dirname, 'hosting_sites', projectId, siteId);
        if (!fs.existsSync(sitePath)) {
            return res.status(404).send('<h1>Suguna Hosting: Site not found</h1><p>The site for this project has not been deployed yet.</p>');
        }

        express.static(sitePath)(req, res, next);
    } catch (e) {
        res.status(500).send('Internal Server Error');
    }
});

app.get('/v1/health', (req, res) => res.json({ status: 'OK', msg: 'SugunaBase Live!' }));

// Check Project Status for App (Public Route)
app.get('/v1/app/check-project/:id', async (req, res) => {
    const projectId = req.params.id;
    console.log(`🔍[App] Checking status for Project ID: ${projectId} `);
    try {
        const result = await pool.query('SELECT google_sign_in_enabled FROM projects WHERE id = $1', [projectId]);
        if (result.rows.length === 0) {
            console.log(`❌ Project ${projectId} not found`);
            return res.json({ exists: false, active: false });
        }
        const active = result.rows[0].google_sign_in_enabled;
        console.log(`✅ Project ${projectId} found.Active: ${active} `);
        res.json({ exists: true, active: active });
    } catch (e) {
        console.error(`🔥 Error checking project ${projectId}: `, e.message);
        res.status(500).json({ error: e.message });
    }
});

// Internal Route to get Project Activity Status for Cloud Functions Hub
app.get('/v1/internal/projects/:projectId/status', async (req, res) => {
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
    const { name, platform, google_client_id } = req.body; // Accept google_client_id
    try {
        const result = await pool.query(
            'INSERT INTO projects (name, platform, user_id, google_sign_in_enabled, google_client_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, platform, req.user.id, !!google_client_id, google_client_id] // Enable if ID provided
        );
        io.to(req.user.id.toString()).emit("project_created", result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/v1/projects/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Project not found" });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET USERS FOR A PROJECT (Console View)
app.get('/v1/projects/:id/users', authenticateToken, async (req, res) => {
    try {
        // 1. Verify Project Ownership
        const projectCheck = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        if (projectCheck.rows.length === 0) return res.status(403).json({ error: "Unauthorized Access to Project" });

        // 2. Fetch Users
        const users = await pool.query(
            'SELECT * FROM app_users WHERE project_id = $1 ORDER BY created_at DESC',
            [req.params.id]
        );
        res.json({ users: users.rows });

    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update Project (Add App)
app.post('/v1/projects/:id/apps', authenticateToken, async (req, res) => {
    const { package_name } = req.body;
    try {
        const result = await pool.query(
            'UPDATE projects SET package_name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [package_name, req.params.id, req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Project not found" });
        io.to(req.user.id.toString()).emit("project_updated", result.rows[0]);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update Project SHA Keys
app.put('/v1/projects/:id/sha', authenticateToken, async (req, res) => {
    const { sha1, sha256 } = req.body;
    try {
        const result = await pool.query(
            'UPDATE projects SET sha1_fingerprint = $1, sha256_fingerprint = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
            [sha1, sha256, req.params.id, req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Project not found" });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Download Config JSON (Suguna Services) - Endpoint to generate the file
app.get('/v1/projects/:id/config', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id] // user.id from Token
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Project not found" });

        const project = result.rows[0];

        // Construct the JSON structure similar to google-services.json but for SugunaBase
        const config = {
            "project_info": {
                "project_id": project.id,
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
app.get('/v1/console/projects/:projectId/functions', authenticateToken, async (req, res) => {
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
app.get('/v1/console/projects/:projectId/functions/:name/logs', authenticateToken, async (req, res) => {
    const { projectId, name } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM function_logs WHERE project_id = $1 AND function_name = $2 ORDER BY created_at DESC LIMIT 50',
            [projectId, name]
        );
        res.json({ logs: result.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/v1/console/projects/:projectId/functions/:name', authenticateToken, async (req, res) => {
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
app.post('/v1/console/projects/:projectId/functions/:name/schedule', authenticateToken, async (req, res) => {
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

server.listen(port, () => console.log(`🚀 SugunaBase Server running on port ${port} `));
