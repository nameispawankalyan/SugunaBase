const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);
const multer = require('multer');
const unzipper = require('unzipper');

const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

const FUNCS_DIR = path.join(__dirname, 'functions');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(FUNCS_DIR)) fs.mkdirSync(FUNCS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: 'uploads/' });

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'suguna_secret_key';

// Middleware to verify REAL tokens from SugunaBase backend
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ error: 'Unauthorized access. Token missing.' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

// ==========================================
// 2. DEPLOY API (Receives ZIP via CLI)
// ==========================================
app.post('/deploy-zip/:projectId/:name', authenticateToken, upload.single('project_code'), async (req, res) => {
    const projectId = req.params.projectId;
    const funcName = req.params.name;

    if (!req.file) {
        return res.status(400).send({ error: 'No zip file provided' });
    }

    const funcDir = path.join(FUNCS_DIR, projectId, funcName);

    try {
        // 1. Create clean directory
        if (fs.existsSync(funcDir)) {
            fs.rmSync(funcDir, { recursive: true, force: true });
        }
        fs.mkdirSync(funcDir, { recursive: true });

        // 2. Extract ZIP
        await fs.createReadStream(req.file.path)
            .pipe(unzipper.Extract({ path: funcDir }))
            .promise();

        // 3. Delete temporary zip
        fs.unlinkSync(req.file.path);

        // 3.5 Copy wrapper and Dockerfile from templates into the function directory
        fs.copyFileSync(path.join(TEMPLATES_DIR, 'Dockerfile'), path.join(funcDir, 'Dockerfile'));
        fs.copyFileSync(path.join(TEMPLATES_DIR, 'wrapper.js'), path.join(funcDir, 'wrapper.js'));

        // 4. Notify main backend about successful deployment
        try {
            const axios = require('axios');
            await axios.post('http://localhost:5000/v1/internal/functions/register', {
                projectId: projectId,
                name: funcName,
                runtime: 'nodejs'
            });
        } catch (err) {
            console.error("[DEPLOY] Failed to register in backend:", err.message);
        }

        // 5. Build docker image locally (for running)
        // In a real system, you might do this via a background worker
        console.log(`[DEPLOY] Building image sgfn-${projectId}-${funcName}...`);
        const buildCmd = `docker build -t sgfn-${projectId}-${funcName} .`;
        // We'll run build but respond to user once initialized
        exec(buildCmd, { cwd: funcDir }, (err) => {
            if (err) console.error(`[DEPLOY] Docker Build Error:`, err);
            else console.log(`[DEPLOY] Image ready: sgfn-${projectId}-${funcName}`);
        });

        res.send({ status: "Success", message: `Function '${funcName}' deployed successfully!` });

    } catch (e) {
        console.error(`[DEPLOY] Error:`, e);
        res.status(500).send({ error: "Deployment failed" });
    }
});

// ==========================================
// 3. RUN API (Executes the Function)
// ==========================================
app.all('/run/:projectId/:name', (req, res) => {
    const projectId = req.params.projectId;
    const funcName = req.params.name;

    // Combine Body and Query params for full event support (GET or POST)
    const eventData = JSON.stringify({
        ...req.query,
        ...req.body
    });

    const imageName = `sgfn-${projectId}-${funcName}`;

    // Spawn docker container temporarily
    const dockerProcess = spawn('docker', ['run', '--rm', '-i', imageName]);

    let output = '';
    let errOutput = '';

    dockerProcess.stdout.on('data', (data) => { output += data.toString(); });
    dockerProcess.stderr.on('data', (data) => { errOutput += data.toString(); });

    const startTime = Date.now();

    dockerProcess.on('close', async (code) => {
        const duration = Date.now() - startTime;
        const finalStatus = code === 0 ? 'success' : 'error';
        const combinedLogs = output + errOutput;

        // NEW: Save logs to main backend
        try {
            const axios = require('axios');
            await axios.post('http://localhost:5000/v1/internal/functions/logs', {
                projectId,
                name: funcName,
                status: finalStatus,
                logs: combinedLogs,
                duration: duration
            });
        } catch (err) {
            console.error("[RUN] Failed to save logs to backend:", err.message);
        }

        if (code !== 0) {
            console.error(`[RUN] Execution failed for ${funcName}. Exit:`, code);
            return res.status(500).send({ error: "Execution Failed", logs: errOutput });
        }

        try {
            // Find valid JSON at the end
            const lines = output.trim().split('\n');
            let jsonResponse = lines[lines.length - 1];
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].startsWith('{"success":')) {
                    jsonResponse = lines[i]; break;
                }
            }

            res.send(JSON.parse(jsonResponse));
        } catch (e) {
            res.status(500).send({ error: "Invalid Output Format", logs: output });
        }
    });

    dockerProcess.stdin.write(eventData);
    dockerProcess.stdin.end();
});

// ==========================================
// 4. DELETE API (Removes Function)
// ==========================================
app.delete('/internal/delete/:projectId/:name', async (req, res) => {
    const { projectId, name } = req.params;
    const funcDir = path.join(FUNCS_DIR, projectId, name);
    const imageName = `sgfn-${projectId}-${name}`;

    try {
        // 1. Remove Docker Image
        exec(`docker rmi -f ${imageName}`, (err) => {
            if (err) console.error(`[DELETE] Failed to remove image ${imageName}:`, err.message);
            else console.log(`[DELETE] Image ${imageName} removed.`);
        });

        // 2. Remove Files
        if (fs.existsSync(funcDir)) {
            fs.rmSync(funcDir, { recursive: true, force: true });
            console.log(`[DELETE] Directory ${funcDir} removed.`);
        }

        res.json({ success: true });
    } catch (e) {
        console.error(`[DELETE] Error:`, e);
        res.status(500).json({ error: "Failed to delete function from hub" });
    }
});

const PORT = 3005;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=== SugunaBase Cloud Functions Hub ===`);
    console.log(`> Server running on http://0.0.0.0:${PORT}`);
    console.log(`> Ready to accept CLI connections!`);
});
