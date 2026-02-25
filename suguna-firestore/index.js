const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3400;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'Suguna Firestore' }));

// Helper to increment analytics
const trackUsage = async (projectId, type) => {
    try {
        const column = type === 'read' ? 'firestore_reads' : 'firestore_writes';
        await pool.query(`
            INSERT INTO project_usage (project_id, date, ${column})
            VALUES ($1, CURRENT_DATE, 1)
            ON CONFLICT (project_id, date) 
            DO UPDATE SET ${column} = project_usage.${column} + 1
        `, [projectId]);
    } catch (e) { console.error("[Firestore Engine] Tracking Error:", e.message); }
};

// --- FIRESTORE ENGINE ---

app.get('/data/*', async (req, res) => {
    const fullPath = req.params[0];
    const segments = fullPath.split('/').filter(s => s.length > 0);
    const project_id = req.headers['x-project-id'];

    if (!project_id) return res.status(400).json({ error: "Missing x-project-id header" });
    if (segments.length === 0) return res.status(400).json({ error: "Invalid path" });

    if (segments.length % 2 === 0) {
        // Document
        const document_id = segments.pop();
        const collection_name = segments.join('/');
        try {
            const result = await pool.query(
                'SELECT data FROM firestore_data WHERE project_id = $1 AND collection_name = $2 AND document_id = $3',
                [project_id, collection_name, document_id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: "Document not found" });
            trackUsage(project_id, 'read');
            res.json(result.rows[0].data);
        } catch (e) { res.status(500).json({ error: e.message }); }
    } else {
        // Collection
        const collection_name = segments.join('/');
        let queryText = 'SELECT document_id, data FROM firestore_data WHERE project_id = $1 AND collection_name = $2';
        const queryParams = [project_id, collection_name];

        const filters = Object.keys(req.query);
        filters.forEach((key, index) => {
            queryText += ` AND data->>'${key}' = $${index + 3}`;
            queryParams.push(req.query[key]);
        });

        queryText += ' ORDER BY created_at DESC';

        try {
            const result = await pool.query(queryText, queryParams);
            trackUsage(project_id, 'read');
            res.json(result.rows.map(r => ({ document_id: r.document_id, data: r.data })));
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
});

app.post('/data/*', async (req, res) => {
    const fullPath = req.params[0];
    const segments = fullPath.split('/').filter(s => s.length > 0);
    const project_id = req.headers['x-project-id'];
    const data = req.body;

    if (!project_id) return res.status(400).json({ error: "Missing x-project-id header" });
    if (segments.length % 2 !== 0) return res.status(400).json({ error: "Must point to a document" });

    const document_id = segments.pop();
    const collection_name = segments.join('/');

    try {
        await pool.query(
            `INSERT INTO firestore_data (project_id, collection_name, document_id, data) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (project_id, collection_name, document_id) DO UPDATE SET data = $4`,
            [project_id, collection_name, document_id, data]
        );
        trackUsage(project_id, 'write');
        res.json({ message: "Document saved" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/data/*', async (req, res) => {
    const fullPath = req.params[0];
    const segments = fullPath.split('/').filter(s => s.length > 0);
    const project_id = req.headers['x-project-id'];
    const updateData = req.body;

    if (segments.length % 2 !== 0) return res.status(400).json({ error: "Must point to a document" });

    const document_id = segments.pop();
    const collection_name = segments.join('/');

    try {
        const result = await pool.query(
            'SELECT data FROM firestore_data WHERE project_id = $1 AND collection_name = $2 AND document_id = $3',
            [project_id, collection_name, document_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Document not found" });

        const newData = { ...result.rows[0].data, ...updateData };
        await pool.query(
            'UPDATE firestore_data SET data = $1 WHERE project_id = $2 AND collection_name = $3 AND document_id = $4',
            [newData, project_id, collection_name, document_id]
        );
        trackUsage(project_id, 'write');
        res.json({ message: "Document updated" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/data/*', async (req, res) => {
    const fullPath = req.params[0];
    const segments = fullPath.split('/').filter(s => s.length > 0);
    const project_id = req.headers['x-project-id'];

    if (segments.length === 0) return res.status(400).json({ error: "Invalid path" });

    if (segments.length % 2 === 0) {
        // Delete Document
        const document_id = segments.pop();
        const collection_name = segments.join('/');
        try {
            await pool.query(
                'DELETE FROM firestore_data WHERE project_id = $1 AND collection_name = $2 AND document_id = $3',
                [project_id, collection_name, document_id]
            );
            trackUsage(project_id, 'write');
            res.json({ message: "Document deleted" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    } else {
        // Delete Collection (Recursive)
        const collection_name = segments.join('/');
        try {
            await pool.query(
                "DELETE FROM firestore_data WHERE project_id = $1 AND (collection_name = $2 OR collection_name LIKE $3)",
                [project_id, collection_name, `${collection_name}/%`]
            );
            trackUsage(project_id, 'write');
            res.json({ message: "Collection deleted" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🔥 Suguna Firestore Microservice running on port ${port}`);
});
