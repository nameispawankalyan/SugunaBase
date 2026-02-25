const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

const port = process.env.PORT || 3700;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'Suguna Logs Streaming' }));

// 1. Ingest Log
app.post('/ingest', async (req, res) => {
    const { projectId, service, level, message } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO system_logs (project_id, service_name, level, message) VALUES ($1, $2, $3, $4) RETURNING *',
            [projectId || 'system', service || 'unknown', level || 'info', message]
        );

        const logEntry = result.rows[0];

        // Stream via Socket.io
        // Specific room for project, and a global 'system' room for admins
        io.to(`project_${projectId}`).emit('new_log', logEntry);
        io.to('admin_logs').emit('new_log', logEntry);

        res.status(201).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Fetch History (Specific Project)
app.get('/history/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const limit = req.query.limit || 100;

    try {
        const result = await pool.query(
            'SELECT * FROM system_logs WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2',
            [projectId, limit]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Fetch All Logs (Global Admin)
app.get('/history/all/stream', async (req, res) => {
    const limit = req.query.limit || 200;
    try {
        const result = await pool.query(
            'SELECT * FROM system_logs ORDER BY created_at DESC LIMIT $2',
            [limit]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('Log Viewer Connected:', socket.id);

    socket.on('subscribe', (projectId) => {
        if (projectId === 'admin_global') {
            socket.join('admin_logs');
            console.log(`🛡️ Admin Socket ${socket.id} subscribed to ALL logs`);
        } else {
            socket.join(`project_${projectId}`);
            console.log(`Socket ${socket.id} subscribed to logs for project: ${projectId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Log Viewer Disconnected');
    });
});

server.listen(port, '127.0.0.1', () => {
    console.log(`📜 Suguna Logs Service running on port ${port}`);
});
