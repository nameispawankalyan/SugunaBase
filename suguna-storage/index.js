const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3500;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'Suguna Storage' }));

// Setup Upload Directory
const uploadDir = path.join(__dirname, 'storage_uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 0. Initialize Table
const initTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS storage_files (
                id SERIAL PRIMARY KEY,
                project_id VARCHAR(100), -- Store as string to support both numeric and slugs
                folder_path TEXT DEFAULT '',
                file_name VARCHAR(255) NOT NULL,
                file_url TEXT NOT NULL,
                file_type VARCHAR(100),
                file_size BIGINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Migrate column type if it's currently integer (common issue)
        try {
            const res = await pool.query(`
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = 'storage_files' AND column_name = 'project_id'
            `);
            if (res.rows.length > 0 && res.rows[0].data_type === 'integer') {
                console.log("🔄 Migrating storage_files.project_id to VARCHAR...");
                await pool.query('ALTER TABLE storage_files ALTER COLUMN project_id TYPE VARCHAR(100) USING project_id::text;');
                console.log("✅ Migration successful");
            }
        } catch (e) {
            console.log("Migration Note:", e.message);
        }
        console.log("✅ storage_files table ready");
    } catch (e) {
        console.error("❌ Storage Table Init Error:", e.message);
    }
};
initTable();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const projId = req.headers['x-project-id'] || 'shared';
        const folderPath = req.headers['x-folder-path'] || '';
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
    limits: { fileSize: 100 * 1024 * 1024 }
});

// Serve static files
app.use('/files', express.static(uploadDir));

// 1. Upload File
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const projectId = req.headers['x-project-id'];
        const folder_path = req.headers['x-folder-path'] || '';
        const file_name = req.file.filename;
        const file_type = req.file.mimetype;
        const file_size = req.file.size;

        // Note: The Gateway will determine the protocol/host for the public URL
        const publicHost = req.headers['x-public-host'] || `http://localhost:${port}`;
        const token = require('crypto').randomUUID();
        const fileUrl = `${publicHost}/storage/${projectId}/${folder_path ? folder_path + '/' : ''}${file_name}?alt=media&token=${token}`;

        const result = await pool.query(
            `INSERT INTO storage_files (project_id, folder_path, file_name, file_url, file_type, file_size) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [String(projectId), folder_path, file_name, fileUrl, file_type, file_size]
        );

        res.json({ message: "File Uploaded Successfully", data: result.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Create Folder (Metadata only)
app.post('/folder', async (req, res) => {
    const { projectId, folder_path } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO storage_files (project_id, folder_path, file_name, file_url, file_type, file_size) 
             VALUES ($1, $2, '', '', 'Folder', 0) RETURNING *`,
            [String(projectId), folder_path]
        );
        res.json({ message: "Folder Created Successfully", data: result.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. List Files
app.get('/list/:projectId', async (req, res) => {
    const { projectId } = req.params; // slug or original ID
    const { altId } = req.query;     // optional numeric ID

    try {
        const result = await pool.query(
            'SELECT * FROM storage_files WHERE project_id = $1 OR project_id = $2 ORDER BY created_at DESC',
            [String(projectId), String(altId || projectId)]
        );
        res.json(result.rows);
    } catch (e) {
        console.error(`[Storage] List Error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

// 4. Delete Files/Folders
app.delete('/delete/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const { altId } = req.query;
    const { ids, folderPaths } = req.body;

    try {
        let deletedCount = 0;
        const projIdStr = String(projectId);
        const altIdStr = String(altId || projectId);

        if (ids && ids.length > 0) {
            const result = await pool.query(`DELETE FROM storage_files WHERE (project_id = $1 OR project_id = $2) AND id = ANY($3::int[]) RETURNING *`, [projIdStr, altIdStr, ids]);
            deletedCount += result.rowCount;
        }

        if (folderPaths && folderPaths.length > 0) {
            for (let fp of folderPaths) {
                const result = await pool.query(`DELETE FROM storage_files WHERE (project_id = $1 OR project_id = $2) AND (folder_path = $3 OR folder_path LIKE $4)`, [projIdStr, altIdStr, fp, `${fp}/%`]);
                deletedCount += result.rowCount;
            }
        }
        res.json({ message: "Deleted successfully", count: deletedCount });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`📦 Suguna Storage Microservice running on port ${port} (All Interfaces)`);
});
